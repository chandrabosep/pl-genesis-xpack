#!/usr/bin/env node
/**
 * Preview how the payment-required message looks in the console.
 * Run: node config/package/preinstall-payment-preview.js
 *
 * Pattern (edit PATTERN to try):
 *   "━✦━"   star in line (default)
 *   "─·─"   dash dot
 *   "◆━━◆"  diamond + line
 *   "▓▒░"   blocks
 */

const payUrl =
	"https://4098f1d48526.ngrok-free.app/pay?session=c391ff77095ebcaf5e4937c9bd13390614d9322cde9a00dcf2b326ddf6fd3abf";
const price = "0.1";

// Repeating separator (no box lines). Try: "▓▓" | "━✦━" | "─·─" | "◆━━◆"
const PATTERN = "▓▓";
const SEP = PATTERN.repeat(22);

// ANSI colors (same as preinstall.js)
const R = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const UNDERLINE = "\x1b[4m";
const GOLD = "\x1b[93m";
const GREEN = "\x1b[92m";
const CYAN = "\x1b[96m";
const MAGENTA = "\x1b[95m";
const BOX = "\x1b[90m";

function showMessage() {
	console.log("");
	console.log(`  ${BOX}${SEP}${R}`);
	console.log("");
	console.log(`     ${GOLD}${BOLD}💳  PAYMENT REQUIRED${R}`);
	console.log(`     ${DIM}Pay below to unlock this package.${R}`);
	console.log("");
	console.log(`  ${BOX}${SEP}${R}`);
	console.log("");
	console.log(
		`     ${GREEN}${BOLD}►  PAY HERE${R}  ${DIM}—  Open in browser or copy this link:${R}`,
	);
	console.log("");
	console.log(`  ${BOX}${SEP}${R}`);
	console.log("");
	console.log(`  ${CYAN}${BOLD}${UNDERLINE}${payUrl}${R}`);
	console.log("");
	console.log(
		`  ${DIM}↑ Copy the full URL above (one line). If it wrapped, paste both parts together.${R}`,
	);
	console.log("");
	console.log(`  ${BOX}${SEP}${R}`);
	console.log(`     ${BOX}${R}`);
	console.log(`     ${MAGENTA}Price: ${String(price)}${R}`);
	console.log(`     After payment, run:  ${BOLD}npm install${R}`);
	console.log("");
	console.log(`  ${BOX}${SEP}${R}`);
	console.log("");
}

// Optional: run with --no-animation to skip the spinner
const noAnimation = process.argv.includes("--no-animation");

if (noAnimation) {
	showMessage();
} else {
	// Short spinner animation (preview only – not used in real preinstall)
	const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
	let i = 0;
	const msg = " Preparing payment link...";
	const spinner = setInterval(() => {
		process.stdout.write(
			`\r  ${GREEN}${frames[i % frames.length]}${R}${msg}${R}`,
		);
		i++;
	}, 80);
	setTimeout(() => {
		clearInterval(spinner);
		process.stdout.write("\r" + " ".repeat(msg.length + 4) + "\r");
		showMessage();
	}, 1200);
}
