<?php
/**
 * Plugin Name:       We Love Cookies
 * Description:       Cookie consent that follows the law where each visitor is. Works as soon as it is activated.
 * Version:           1.0.0
 * Requires at least: 5.7
 * Requires PHP:      7.2
 * Text Domain:       welovecookies
 * License:           Proprietary. Copyright (c) 2026 g-baskin. All rights reserved.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WELOVECOOKIES_VERSION', '1.0.0' );

/**
 * Banner settings. Change them from a theme or plugin with the `welovecookies_config` filter.
 */
function welovecookies_config() {
	$config  = array(
		'mode' => 'auto',
		'rev'  => 1,
	);
	$privacy = get_privacy_policy_url();
	if ( $privacy ) {
		$config['links'] = array( 'privacyPolicy' => $privacy );
	}
	return apply_filters( 'welovecookies_config', $config );
}

// Priority 1 so the consent defaults are set before analytics and ad tags in the head.
add_action(
	'wp_head',
	function () {
		wp_print_inline_script_tag( 'window.WeLoveCookiesConfig = ' . wp_json_encode( welovecookies_config(), JSON_HEX_TAG | JSON_HEX_AMP ) . ';' );
		wp_print_script_tag(
			array(
				'src' => add_query_arg( 'ver', WELOVECOOKIES_VERSION, plugins_url( 'assets/welovecookies.min.js', __FILE__ ) ),
			)
		);
	},
	1
);

/**
 * [welovecookies_settings] prints a "Cookie settings" button that reopens the choices.
 * [welovecookies_settings label="Manage cookies"] changes its text.
 */
add_shortcode(
	'welovecookies_settings',
	function ( $atts ) {
		$atts = shortcode_atts( array( 'label' => __( 'Cookie settings', 'welovecookies' ) ), $atts, 'welovecookies_settings' );
		return '<button type="button" class="welovecookies-settings" onclick="window.WeLoveCookies &amp;&amp; window.WeLoveCookies.openPreferences()">' . esc_html( $atts['label'] ) . '</button>';
	}
);
