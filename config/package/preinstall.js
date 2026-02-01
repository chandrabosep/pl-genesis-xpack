const allowed = true;
const price = 0;
const payUrl = "https://pay.hackmoney.ai";

async function startInstall() {
	if (allowed) {
		console.log("Install allowed.");
		return;
	} else {
		console.error("");
		console.error("");
		console.error("");
		console.error("");
		console.error("");
		console.error(
			"======================= PAYMENT REQUIRED ==========================================",
		);
		console.error(`Price: ${price}`);
		console.error(`Pay here: ${payUrl}`);
		console.error("After payment, rerun npm install.");
		console.error(
			"======================= END PAYGATE ==========================================",
		);
		console.error("");
		console.error("");
		console.error("");
		console.error("");

		process.exit(1);
	}
}

startInstall();
