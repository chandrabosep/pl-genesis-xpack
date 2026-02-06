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

function CodeBlock({
	label,
	value,
	copyLabel = "Copy",
}: {
	label: string;
	value: string;
	copyLabel?: string;
}) {
	return (
		<div className="rounded-lg border border-border bg-muted/40 overflow-hidden">
			<div className="flex items-center justify-between gap-2 border-b border-border bg-muted/60 px-3 py-1.5">
				<span className="text-xs font-medium text-muted-foreground font-mono">
					{label}
				</span>
				<CopyButton
					value={value}
					label={copyLabel}
					buttonText="Copy"
					size="xs"
					variant="ghost"
					className="h-7 text-muted-foreground"
				/>
			</div>
			<pre className="max-h-80 overflow-auto p-4 text-xs font-mono text-foreground leading-relaxed whitespace-pre">
				<code>{value}</code>
			</pre>
		</div>
	);
}

function Note({ children }: { children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
			<span className="font-semibold text-primary">Note:</span> {children}
		</div>
	);
}

export function ProjectPreinstallCard({
	preinstallScript,
	projectId,
	apiKey,
	host,
}: {
	preinstallScript: string;
	projectId?: string;
	apiKey?: string;
	host?: string;
}) {
	const effectiveProjectId = projectId?.trim() ?? PLACEHOLDER_PROJECT_ID;
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
		<Card className="rounded-xl border border-border/80 bg-card shadow-sm scroll-mt-6" id="integration-guide">
			<CardHeader className="space-y-1">
				<CardTitle className="text-lg font-semibold tracking-tight text-foreground">
					Integration guide
				</CardTitle>
				<CardDescription className="text-sm leading-relaxed">
					Add the preinstall script to your package so installs are validated with this project:
					the script checks xpack config, can require GitHub identity and payment, then polls until payment is confirmed.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-8 pt-2">
				{/* Step 1 */}
				<section className="space-y-2">
					<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
						<span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
							1
						</span>
						Open your package
					</h3>
					<p className="text-sm text-muted-foreground pl-8">
						Open your package root in VS Code or any editor (same folder as <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">package.json</code>).
					</p>
				</section>

				{/* Step 2 */}
				<section className="space-y-2">
					<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
						<span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
							2
						</span>
						Add the preinstall script
					</h3>
					<p className="text-sm text-muted-foreground pl-8">
						Create a file named <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">preinstall.js</code> in your package root and paste the code below.
					</p>
					<div className="pl-8">
						<CodeBlock
							label="preinstall.js"
							value={preinstallScript}
							copyLabel="Copy preinstall script"
						/>
					</div>
				</section>

				{/* Step 3 */}
				<section className="space-y-3">
					<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
						<span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
							3
						</span>
						Update package.json
					</h3>
					<p className="text-sm text-muted-foreground pl-8">
						Add the following to your <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">package.json</code>. Use the Project ID, API key, and app URL from the Credentials section above.
					</p>

					<Note>
						Use the <code className="rounded bg-muted px-1 py-0.5 font-mono">preinstall</code> script (not <code className="rounded bg-muted px-1 py-0.5 font-mono">install</code>). The script runs before dependencies are installed.
					</Note>

					<div className="space-y-4 pl-8">
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1.5">scripts</p>
							<CodeBlock
								label="package.json"
								value={`"scripts": {
  ...
  "preinstall": "node ./preinstall.js"
},`}
								copyLabel="Copy scripts snippet"
							/>
						</div>
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1.5">files (publish only the script)</p>
							<CodeBlock
								label="package.json"
								value={'"files": ["preinstall.js"]'}
								copyLabel="Copy files snippet"
							/>
						</div>
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1.5">engines (Node &gt;= 18 for fetch)</p>
							<CodeBlock
								label="package.json"
								value={'"engines": {\n  "node": ">=18.0.0"\n}'}
								copyLabel="Copy engines snippet"
							/>
						</div>
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1.5">xpack config (projectId, apiKey, host — no .env)</p>
							<CodeBlock
								label="package.json"
								value={xpackConfig}
								copyLabel="Copy xpack config"
							/>
						</div>
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1.5">Optional: docsUrl — custom payment/docs URL</p>
							<CodeBlock
								label="package.json"
								value={`"xpack": {
  ...
  "docsUrl": "https://your-docs.com/pay"
}`}
								copyLabel="Copy docsUrl snippet"
							/>
						</div>
					</div>
				</section>

				{/* Example */}
				<section className="space-y-2">
					<h3 className="text-sm font-semibold text-foreground">
						Example package.json
					</h3>
					<p className="text-sm text-muted-foreground">
						Full example with all required fields. Replace placeholders with your Project ID, API key, and host from Credentials above.
					</p>
					<CodeBlock
						label="package.json"
						value={examplePackageJson}
						copyLabel="Copy example package.json"
					/>
				</section>

				<p className="text-sm text-muted-foreground border-t border-border/60 pt-4">
					Put <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">preinstall.js</code> in your package root (same folder as <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">package.json</code>). No .env required — use <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">xpack.projectId</code>, <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">xpack.apiKey</code>, and <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">xpack.host</code> in package.json.
				</p>
			</CardContent>
		</Card>
	);
}
