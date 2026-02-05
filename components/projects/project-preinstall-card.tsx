"use client";

import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardDescription,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";

const PLACEHOLDER_PROJECT_ID = "YOUR_PROJECT_ID";
const PLACEHOLDER_API_KEY = "YOUR_API_KEY";
const PLACEHOLDER_HOST = "https://yourapp.com";

function buildXpackConfig(projectId: string, apiKey: string, host: string) {
	return `"xpack": {
  "projectId": "${projectId}",
  "apiKey": "${apiKey}",
  "host": "${host}"
}`;
}

function buildExamplePackageJson(
	projectId: string,
	apiKey: string,
	host: string,
) {
	return `{
  "name": "your-package-name",
  "version": "1.0.0",
  "scripts": {
    "preinstall": "node ./preinstall.js"
  },
  "files": ["preinstall.js"],
  "engines": {
    "node": ">=18.0.0"
  },
  "xpack": {
    "projectId": "${projectId}",
    "apiKey": "${apiKey}",
    "host": "${host}"
  }
}`;
}

export function ProjectPreinstallCard({
	preinstallScript,
	projectId,
	apiKey,
	host,
}: {
	preinstallScript: string;
	/** When provided, xpack config blocks show these values instead of placeholders. */
	projectId?: string;
	apiKey?: string;
	host?: string;
}) {
	const effectiveProjectId =
		projectId?.trim() ?? PLACEHOLDER_PROJECT_ID;
	const effectiveApiKey = apiKey?.trim() ?? PLACEHOLDER_API_KEY;
	const effectiveHost = host?.trim() ?? PLACEHOLDER_HOST;
	const xpackConfig = buildXpackConfig(
		effectiveProjectId,
		effectiveApiKey,
		effectiveHost,
	);
	const examplePackageJson = buildExamplePackageJson(
		effectiveProjectId,
		effectiveApiKey,
		effectiveHost,
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>How to add code to the package</CardTitle>
				<CardDescription>
					The preinstall script validates installs with this project:
					checks xpack config, optionally requires GitHub identity and
					payment, then polls until payment is confirmed. Follow the
					steps below to add it to your package.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-2">
					<p className="font-medium">Step 1</p>
					<p className="text-sm text-muted-foreground">
						Open your package in VSCode (or any editor).
					</p>
				</div>

				<div className="space-y-2">
					<p className="font-medium">Step 2</p>
					<p className="text-sm text-muted-foreground">
						Create a file named{" "}
						<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
							preinstall.js
						</code>{" "}
						in your package root and paste the following code:
					</p>
					<div className="relative">
						<pre className="max-h-80 overflow-auto rounded-lg border bg-muted/50 p-4 text-xs font-mono">
							<code className="whitespace-pre">
								{preinstallScript}
							</code>
						</pre>
						<div className="absolute right-2 top-2">
							<CopyButton
								value={preinstallScript}
								label="Copy preinstall script"
								buttonText="Copy script"
							/>
						</div>
					</div>
				</div>

				<div className="space-y-3">
					<p className="font-medium">Step 3</p>
					<p className="text-sm text-muted-foreground">
						Add or update the following in your{" "}
						<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
							package.json
						</code>
						:
					</p>
					<ol className="list-inside list-decimal space-y-3 text-sm text-muted-foreground">
						<li>
							<span className="font-medium text-foreground">
								Preinstall script
							</span>{" "}
							(use{" "}
							<code className="rounded bg-muted px-1 py-0.5 font-mono">
								preinstall
							</code>
							, not{" "}
							<code className="rounded bg-muted px-1 py-0.5 font-mono">
								install
							</code>
							) — add inside{" "}
							<code className="rounded bg-muted px-1 py-0.5 font-mono">
								scripts
							</code>
							:
							<div className="relative mt-1">
								<pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 pr-12 font-mono text-xs">
									{`"scripts": {
    ...
    "preinstall": "node ./preinstall.js"
  },`}
								</pre>
								<div className="absolute right-2 top-2">
									<CopyButton
										value={`"scripts": {\n    ...\n    "preinstall": "node ./preinstall.js"\n  },`}
										label="Copy scripts snippet"
										buttonText="Copy"
									/>
								</div>
							</div>
						</li>
						<li>
							<span className="font-medium text-foreground">
								Publish only the script
							</span>
							:
							<div className="relative mt-1">
								<pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 pr-12 font-mono text-xs">
									{`"files": ["preinstall.js"]`}
								</pre>
								<div className="absolute right-2 top-2">
									<CopyButton
										value={'"files": ["preinstall.js"]'}
										label="Copy files snippet"
										buttonText="Copy"
									/>
								</div>
							</div>
						</li>
						<li>
							<span className="font-medium text-foreground">
								Minimum Node version
							</span>{" "}
							(needed for{" "}
							<code className="rounded bg-muted px-1 py-0.5 font-mono">
								fetch
							</code>
							):
							<div className="relative mt-1">
								<pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 pr-12 font-mono text-xs">
									{`"engines": {
  "node": ">=18.0.0"
}`}
								</pre>
								<div className="absolute right-2 top-2">
									<CopyButton
										value={`"engines": {\n  "node": ">=18.0.0"\n}`}
										label="Copy engines snippet"
										buttonText="Copy"
									/>
								</div>
							</div>
						</li>
						<li>
							<span className="font-medium text-foreground">
								xpack config
							</span>{" "}
							(projectId, apiKey, host — no .env needed):
							<div className="relative mt-1">
								<pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 pr-12 font-mono text-xs">
									{xpackConfig}
								</pre>
								<div className="absolute right-2 top-2">
									<CopyButton
										value={xpackConfig}
										label="Copy xpack config"
										buttonText="Copy"
									/>
								</div>
							</div>
						</li>
						<li>
							<span className="font-medium text-foreground">
								Optional: docsUrl
							</span>{" "}
							— custom payment or docs URL (if omitted, the script
							uses{" "}
							<code className="rounded bg-muted px-1 py-0.5 font-mono">
								host + /pay?session=...
							</code>
							):
							<div className="relative mt-1">
								<pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 pr-12 font-mono text-xs">
									{`"xpack": {
  ...
  "docsUrl": "https://your-docs.com/pay"
}`}
								</pre>
								<div className="absolute right-2 top-2">
									<CopyButton
										value={`"xpack": {\n  ...\n  \"docsUrl\": \"https://your-docs.com/pay\"\n}`}
										label="Copy docsUrl snippet"
										buttonText="Copy"
									/>
								</div>
							</div>
						</li>
						<li>
							<span className="font-medium text-foreground">
								Location:
							</span>{" "}
							Put{" "}
							<code className="rounded bg-muted px-1 py-0.5 font-mono">
								preinstall.js
							</code>{" "}
							in your package root (same folder as{" "}
							<code className="rounded bg-muted px-1 py-0.5 font-mono">
								package.json
							</code>
							).
						</li>
					</ol>
					<p className="mt-3 text-sm font-medium text-foreground">
						Example package.json
					</p>
					<div className="relative mt-1">
						<pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-xs font-mono">
							<code>{examplePackageJson}</code>
						</pre>
						<div className="absolute right-2 top-2">
							<CopyButton
								value={examplePackageJson}
								label="Copy example package.json"
								buttonText="Copy"
							/>
						</div>
					</div>
				</div>

				<p className="text-sm text-muted-foreground">
					Add{" "}
					<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
						xpack.projectId
					</code>
					,{" "}
					<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
						xpack.apiKey
					</code>
					, and{" "}
					<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
						xpack.host
					</code>{" "}
					to your{" "}
					<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
						package.json
					</code>{" "}
					(use the Project ID, API key, and app URL from this page).
					Optional:{" "}
					<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
						xpack.docsUrl
					</code>{" "}
					for a custom payment/docs link. No .env required.
				</p>
			</CardContent>
		</Card>
	);
}
