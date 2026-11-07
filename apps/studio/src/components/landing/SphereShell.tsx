export function SphereShell({
	count = 3,
	ring = false,
}: {
	count?: number;
	ring?: boolean;
}) {
	return (
		<>
			<span className="sphere-body" aria-hidden="true" />
			<span className="sphere-orbits" aria-hidden="true">
				{ring ? <em className="sphere-ring" /> : null}
				{Array.from({ length: count }, (_, index) => (
					<i key={index} />
				))}
			</span>
		</>
	);
}
