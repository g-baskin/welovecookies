/** Ecom Cookie: read-only "What we hold about them" for one privacy request. Changes nothing. */
import { desc, eq, inArray, or } from 'drizzle-orm';
import { getDb, schema } from '#lib/server/db/index.ts';

export async function dataSummary(requestId: string) {
	const db = getDb();
	const s = schema;
	const req = await db
		.select()
		.from(s.privacyRequests)
		.where(eq(s.privacyRequests.id, requestId))
		.get();
	if (!req) return null;
	const email = req.email.toLowerCase();
	const customer =
		(req.customerId
			? await db.select().from(s.customers).where(eq(s.customers.id, req.customerId)).get()
			: undefined) ??
		(await db.select().from(s.customers).where(eq(s.customers.email, email)).get()) ??
		null;
	const orderWhere = customer
		? or(eq(s.orders.customerId, customer.id), eq(s.orders.email, email))
		: eq(s.orders.email, email);
	const orders = await db
		.select()
		.from(s.orders)
		.where(orderWhere)
		.orderBy(desc(s.orders.createdAt))
		.all();
	const items = orders.length
		? await db
				.select()
				.from(s.orderItems)
				.where(
					inArray(
						s.orderItems.orderId,
						orders.map((o) => o.id)
					)
				)
				.all()
		: [];
	const reviews = await db
		.select({
			product: s.products.title,
			rating: s.reviews.rating,
			title: s.reviews.title,
			body: s.reviews.body,
			authorName: s.reviews.authorName,
			createdAt: s.reviews.createdAt
		})
		.from(s.reviews)
		.leftJoin(s.products, eq(s.products.id, s.reviews.productId))
		.where(eq(s.reviews.authorEmail, email))
		.orderBy(desc(s.reviews.createdAt))
		.all();
	const requests = await db
		.select()
		.from(s.privacyRequests)
		.where(eq(s.privacyRequests.email, email))
		.orderBy(desc(s.privacyRequests.createdAt))
		.all();
	const consentIds = [
		...new Set(requests.map((r) => r.consentId).filter((x): x is string => !!x))
	].sort();
	const cr = s.consentRecords;
	const consentWhere =
		consentIds.length && customer
			? or(inArray(cr.consentId, consentIds), eq(cr.customerId, customer.id))
			: consentIds.length
				? inArray(cr.consentId, consentIds)
				: customer
					? eq(cr.customerId, customer.id)
					: null;
	const choices = consentWhere
		? await db.select().from(cr).where(consentWhere).orderBy(desc(cr.createdAt)).all()
		: [];
	const addresses = new Map<string, NonNullable<(typeof orders)[number]['shippingAddress']>>();
	for (const a of [
		customer?.defaultAddress,
		...orders.flatMap((o) => [o.shippingAddress, o.billingAddress])
	]) {
		if (!a) continue;
		const key = [
			a.firstName,
			a.lastName,
			a.address1,
			a.address2,
			a.city,
			a.province,
			a.zip,
			a.country
		].join('|');
		if (!addresses.has(key)) addresses.set(key, a);
	}
	return {
		email,
		request: req,
		customer: customer
			? {
					id: customer.id,
					name: `${customer.firstName} ${customer.lastName}`.trim(),
					email: customer.email,
					phone: customer.phone ?? '',
					createdAt: customer.createdAt,
					acceptsMarketing: customer.acceptsMarketing,
					emailVerified: !!customer.emailVerifiedAt
				}
			: null,
		addresses: [...addresses.values()],
		orders: orders.map((o) => ({
			id: o.id,
			number: o.number,
			createdAt: o.createdAt,
			total: o.total,
			currency: o.currency,
			items: items
				.filter((i) => i.orderId === o.id)
				.map((i) => ({ title: i.title, variantTitle: i.variantTitle, quantity: i.quantity }))
		})),
		reviews,
		choices: choices.map((c) => ({
			createdAt: c.createdAt,
			action: c.action,
			analytics: !!c.analytics,
			marketing: !!c.marketing,
			preferences: !!c.preferences,
			country: c.country,
			regionCode: c.regionCode
		})),
		requests: requests.map((r) => ({ createdAt: r.createdAt, kind: r.kind, status: r.status }))
	};
}
