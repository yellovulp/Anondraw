var port = process.argv[2];
if (!port) throw "No port provided!";

var http = require("http");

var server = http.createServer();
server.listen(port);

// Socket library
var io = require('socket.io')(server, {
	transports: ['websocket']
});

// Library to register to the main server
var Register = require("./scripts/Register.js");
var register = new Register("direct.anondraw.com", require("./join_code_password.js"), io, port, server);
// var register = new Register("localhost", require("./join_code_password.js"), io, port, server);
// var register = {isOurs: function (room, callback) {callback(null, true);}, updatePlayerCount: function () {}};

// Library to check login/register and skins
var Players = require("./scripts/Players.js");
var players = new Players("direct.anondraw.com");
// var players = new Players("localhost");

var Background = require("./scripts/Background.js");
var background = new Background("direct.anondraw.com", undefined, require("./draw_password.js"));
//var background = new Background("localhost", undefined, require("./draw_password.js"));

// Drawtogether library
var DrawTogether = require("./scripts/DrawTogether.js");
var drawTogether = new DrawTogether(background);

var imgur = require("imgur");
imgur.setCredentials("anondraw", require("./imgur_password.js"));

var Protocol = require("./scripts/Network.js");
var protocol = new Protocol(io, drawTogether, imgur, players, register);

function saveAndShutdown () {
	console.log("SAVING AND SHUTTING DOWN");
	var rooms = Object.keys(drawTogether.drawings);
	var roomCount = rooms.length;

	for (var k = 0; k < rooms.length; k++) {
		var room = rooms[k];

		console.log("SAVING ROOM", room);
		background.sendDrawings(room, drawTogether.drawings[room], function (room) {
			roomCount--;
			console.log("ROOM", room, "HAS BEEN SAVED", roomCount, "ROOMS TO GO");
			if (roomCount == 0) process.exit(0);
		}.bind(this, room));
	}

	console.log("LETTING THE CLIENTS KNOW");
	io.emit("chatmessage", {
		user: "SERVER",
		message: "SERVER IS RESTARTING"
	});

	io.emit("chatmessage", {
		user: "SERVER",
		message: "You will automatically reconnect."
	});
	
	server.close();

	// If there were no rooms, just shutdown now
	if (rooms.length === 0) {
		process.exit(0);
	}
}

// Shut down, send drawings and stop all connections
process.on("SIGTERM", saveAndShutdown);

// Restart the server every so often
setTimeout(saveAndShutdown, 6 * 60 * 60 * 1000);