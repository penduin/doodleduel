var DD = {
	ctx1: null,
	ctx2: null,
	player: {
		ctx: null,  //active, foreground ctx
		lastmove: 0,
		drawing: false,
		color: "purple"
	},
	remote: {
		ctx: null,
		drawing: false,
		color: "orange"
	},
	swap: {
		button: null,
		hurry: null,
		timer: null
	},
	socket: null
};

function swap() {
	clearInterval(DD.swap.timer);
	DD.swap.button.classList.toggle("wait", false);
	DD.swap.hurry.classList.toggle("hidden", true);

	if(DD.ctx1.canvas.classList.toggle("fg")) {
		DD.player.ctx = DD.ctx1;
		DD.remote.ctx = DD.ctx2;
	}
	if(DD.ctx2.canvas.classList.toggle("fg")) {
		DD.player.ctx = DD.ctx2;
		DD.remote.ctx = DD.ctx1;
	}
}
function requestSwap(fromserver) {
	var countdown = function() {
		var count = 5;
		DD.swap.hurry.innerHTML = count;
		DD.swap.hurry.classList.toggle("hidden", false);
		var tick = function() {
			--count;
			if(count < 1) {
				swap();
			} else {
				DD.swap.hurry.innerHTML = count;
			}
		};
		DD.swap.timer = setInterval(tick, 1000);
	};
	if(DD.socket && !fromserver) {
		if(DD.swap.button.classList.contains("wait")) {
			//we are waiting, ignore
		} else {
			//we are not waiting
			if(DD.swap.hurry.classList.contains("hidden")) {
				//start the countdown
				if(!fromserver) {
					DD.swap.button.classList.toggle("wait", true);
				}
				if(DD.socket) {
					DD.socket.emit("swap", {});
				} else {
					//countdown();
					swap();
				}
			} else {
				//cut off the countdown
				console.log("enough!");
				if(DD.socket) {
					DD.socket.emit("swapnow", {});
				}
			}
		}
	} else {
		//we are not waiting
		if(DD.swap.hurry.classList.contains("hidden")) {
			if(!fromserver) {
				DD.swap.button.classList.toggle("wait", true);
			}
			if(DD.socket) {
				countdown();
			} else {
				swap();
			}
		}
	}
}

function clear(ctx) {
	var list = [DD.ctx1, DD.ctx2];
	if(ctx) {
		list = [ctx];
	}

	list.every(function(ctx) {
		ctx.canvas.width = ctx.canvas.width;
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.lineWidth = 8;
		ctx.lineCap = "round";
		return true;
	});
}

// drawing functions
function mouseDown(e) {
	var touches = e.changedTouches;
	if(e.changedTouches && e.changedTouches.length) {
		e = e.changedTouches[0];
	}
	if(e.target !== DD.player.ctx.canvas) {
		return;
	}

	if(DD.socket) {
		DD.socket.emit("start", {});
	}

	DD.player.drawing = true;
	DD.player.ctx.strokeStyle = DD.player.color;
	DD.player.ctx.beginPath();
	mouseMove(e);
}
function mouseMove(e) {
	var touches = e.changedTouches;
	if(e.changedTouches && e.changedTouches.length) {
		e = e.changedTouches[0];
	}
	var now = new Date();
	var x = e.clientX;
	var y = e.clientY;
	var elm = e.target
	while(elm && elm.offsetLeft !== undefined) {
		x -= elm.offsetLeft;
		y -= elm.offsetTop;
		elm = elm.offsetParent;
	}
	if(now - DD.player.lastmove < 16) {  // throttle move events to 60/s
		return;
	}
	if(!DD.player.drawing) {
		return;
	}
	if(x / DD.player.ctx.canvas.clientWidth < 0 ||
	   x / DD.player.ctx.canvas.clientWidth > 1 ||
	   y / DD.player.ctx.canvas.clientHeight < 0 ||
	   y / DD.player.ctx.canvas.clientHeight > 1) {
		mouseUp();
		return;
	}

	if(DD.socket) {
		DD.socket.emit("move", {
			x: x / DD.player.ctx.canvas.clientWidth,
			y: y / DD.player.ctx.canvas.clientHeight
		});
	}

	DD.player.ctx.lineTo(x / DD.player.ctx.canvas.clientWidth * DD.player.ctx.canvas.width,
						 y / DD.player.ctx.canvas.clientHeight * DD.player.ctx.canvas.height);
	DD.player.ctx.stroke();
	DD.player.lastmove = now;
}
function mouseUp(e) {
	DD.player.drawing = false;
	if(e) {
		mouseMove(e);
	}

	if(DD.socket) {
		DD.socket.emit("stop", {});
	}

	DD.player.ctx.stroke();
}

function remoteclear() {
	clear(DD.remote.ctx);
}
function remotestart() {
	DD.remote.drawing = true;
	DD.remote.ctx.strokeStyle = DD.remote.color;
	DD.remote.ctx.beginPath();
}
function remotemove(coords) {
	DD.remote.ctx.lineTo(coords.x * DD.remote.ctx.canvas.width,
						 coords.y * DD.remote.ctx.canvas.height);
	DD.remote.ctx.stroke();
}
function remotestop() {
	DD.remote.drawing = false;
	DD.remote.ctx.stroke;
}

window.addEventListener("load", function() {
	var canv1 = document.querySelector("#canv1");
	var canv2 = document.querySelector("#canv2");
	DD.ctx1 = canv1.getContext("2d");
	DD.ctx2 = canv2.getContext("2d");

	DD.player.ctx = DD.ctx1;
	DD.remote.ctx = DD.ctx2;

	// canvas events
	[canv1, canv2].every(function(canv) {
		canv.addEventListener("mousedown", mouseDown);
		canv.addEventListener("mousemove", mouseMove);
		canv.addEventListener("mouseup", mouseUp);
		canv.addEventListener("mouseout", mouseUp);
		canv.addEventListener("touchstart", mouseDown);
		canv.addEventListener("touchmove", mouseMove);
		canv.addEventListener("touchend", mouseUp);
		canv.addEventListener("touchcancel", mouseUp);
		canv.addEventListener("touchleave", mouseUp);
		return true;
	});

	// buttons
	DD.swap.hurry = document.querySelector("#hurry");
	DD.swap.button = document.querySelector("#swap");
	DD.swap.button.addEventListener("click", function() {
		requestSwap();
	});
	document.querySelector("#clear").addEventListener("click", function() {
		if(DD.socket) {
			DD.socket.emit("clear", {});
		}
		clear(DD.player.ctx);
	});

	clear();

	//network
	try {
		DD.socket = io();
		DD.socket.on("swap", function() {
			requestSwap(true);
		});
		DD.socket.on("swapnow", function() {
			swap();
		});
		DD.socket.on("clear", function() {
			remoteclear();
		});
		DD.socket.on("start", function() {
			remotestart();
		});
		DD.socket.on("move", function(data) {
			remotemove(data);
		});
		DD.socket.on("stop", function() {
			remotestop();
		});
	} catch(e) {
		console.log("no socket; local play only.");
	}
});

// hacks for dumb modern mobile browsers
//document.addEventListener("touchstart", function(){}, true);
