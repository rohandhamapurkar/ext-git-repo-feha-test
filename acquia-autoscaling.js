// acquia-autoscaling.js
const { collectDefaultMetrics, Registry } = require("prom-client");
const http = require("http");
const net = require("net");

function startMetricsSvr() {
	// Create a new registry to track default metrics
	const register = new Registry();

	// Enable the collection of default metrics
	collectDefaultMetrics({ register });

	// Set up an HTTP server to expose the metrics

	const server = http.createServer(async (req, res) => {
		if (req.url === "/metrics") {
			try {
				// Respond with metrics in Prometheus format
				res.setHeader("Content-Type", register.contentType);
				const metrics = await register.metrics();
				res.end(metrics);
			} catch (err) {
				res.writeHead(500);
				res.end(err.message);
			}
		} else {
			res.writeHead(404);
			res.end("Not Found");
		}
	});

	const monitoringPort = 9100;
	server.listen(monitoringPort, () => {
		console.log(
			`Acquia Node.js Monitoring server listening on port ${monitoringPort}`
		);
	});
	// Prevent the Node.js process from exiting
	process.stdin.resume();
}

const originalListen = net.Server.prototype.listen;
let injected = false;

net.Server.prototype.listen = function (...args) {
	try {
		const port =
			typeof args[0] === "number"
				? args[0]
				: typeof args[0] === "string" && !isNaN(parseInt(args[0]))
				? parseInt(args[0])
				: args[0] && typeof args[0].port === "number"
				? args[0].port
				: args[0] &&
				  typeof args[0].port === "string" &&
				  !isNaN(parseInt(args[0].port))
				? parseInt(args[0].port)
				: null;
		if (port === 3000 && !injected) {
			injected = true;
			setTimeout(startMetricsSvr, 1000);
		}
	} catch (err) {
		console.error(err);
	}

	return originalListen.apply(this, args);
};
