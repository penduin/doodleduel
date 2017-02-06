var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);

app.get("*", function(req, res) {
	if(req.url.indexOf("/.") >= 0) {
		res.send("nope.");
	} else {
		res.sendFile(__dirname + req.url);
	}
});

io.on("connection", function(socket) {
	//console.log("someone's here");
	socket.on("clear", function(data) {
		socket.broadcast.emit("clear");
	});
	socket.on("start", function(data) {
		socket.broadcast.emit("start");
	});
	socket.on("move", function(data) {
		socket.broadcast.emit("move", data);
	});
	socket.on("stop", function(data) {
		socket.broadcast.emit("stop");
	});

	socket.on("swap", function(data) {
		io.emit("swap");
	});
	socket.on("swapnow", function(data) {
		io.emit("swapnow");
	});

	socket.on("disconnect", function() {
		//console.log("someone left");
	});
});

http.listen(1138, function() {
	console.log("listening on *:1138");
});
