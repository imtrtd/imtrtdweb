import { LandingPage } from "./pages/Landing";
import { AdminPage } from "./pages/Admin";
import { SystemsPage } from "./pages/Systems";
import { WorkPage } from "./pages/Work";
import { SamplesPage } from "./pages/Samples";
import { Cosmos } from "./components/cosmos/Cosmos";
import { DriftBed, DriftToggle } from "./components/landing/DriftControl";

function App() {
	const path = window.location.pathname.replace(/\/+$/, "") || "/";
	if (path === "/admin" || path.startsWith("/admin/")) {
		return (
			<div className="admin-shell">
				<AdminPage />
			</div>
		);
	}
	let page = <LandingPage />;
	if (path === "/systems") page = <SystemsPage />;
	else if (path === "/samples") page = <SamplesPage />;
	else if (path.startsWith("/work/")) page = <WorkPage slug={path.slice("/work/".length)} />;
	return (
		<>
			<Cosmos />
			<DriftBed />
			<DriftToggle />
			{page}
		</>
	);
}

export default App;