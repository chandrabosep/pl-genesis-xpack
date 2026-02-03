import { readFile } from "fs/promises";
import { join } from "path";
import { ProjectDetailPage } from "@/components/projects/project-detail-page";

/** Server component: reads preinstall script from config and passes to client. */
export default async function ProjectDetailRoute() {
	const scriptPath = join(process.cwd(), "config/package/preinstall.js");
	let preinstallScript: string;
	try {
		preinstallScript = await readFile(scriptPath, "utf-8");
	} catch {
		preinstallScript = "";
	}
	const appHost =
		process.env.NEXT_PUBLIC_APP_URL ??
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
	return (
		<ProjectDetailPage
			preinstallScript={preinstallScript}
			appHost={appHost}
		/>
	);
}
