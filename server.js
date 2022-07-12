const express = require("express");
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const bcrypt = require("bcrypt");
const dbConnect = require("./database/databaseConnection.js");
const session = require('express-session');


users = [];

//application
app.set("view engine", "ejs");
app.use(express.static("scripts"));
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());
app.use(session({
	secret: 'its a secret',
	saveUninitialized: true,
	resave: true
}));

//render login file
app.get('/', function(req, res){
	res.render('login.ejs');
});


//for the post form within the login page
app.post('/login', async function(req, res) {
	let username = req.body.username;
	let password = req.body.password;

	let query1 = "SELECT * FROM user where userName = ?";
	let params1 = username;

	dbConnect.query(query1, params1, function(err, results){
		if(err) throw err;
		if(results == 0){
			res.render('login.ejs', {
				errorMessage : "Incorrect username"
			});
		}
		else{
			var storedPw = results[0]["passWord"]
			const verifiedPw = bcrypt.compareSync(password, storedPw);
			if(verifiedPw){
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/lobby');

			}
			else{
				res.render('login.ejs', {
					errorMessage : "Incorrect Password"
				});
			}
		}
	});
});

//render registration file
app.get('/registration', function(req, res){
	res.render('registration.ejs');
});


app.post("/register", async function(req, res){
	let username = req.body.username;
	let password = req.body.password;

	let query = "SELECT * FROM user where userName = ?";
	let params = username;
	dbConnect.query(query, params, async function(err, results){
		if(err) throw err;
		if(results.length > 0){
			res.render('registration.ejs', {
				errorMessage : "Username already in use"
			});
		}else{
			let hashedPw = await bcrypt.hash(password,10);
			if (username && hashedPw) {
				let stmt = 'INSERT INTO user (userName, passWord) VALUES (?, ?)';
				let newUser = [username, hashedPw];
				dbConnect.query(stmt, newUser, (err, results) => {
					if (err) {
						res.send(err);
					}else{
						res.redirect('/');
					}
				});
			}
		}
	});
});


//rendering the lobby where a user can join or create a room
app.get('/lobby', function(req, res){
	if(req.session.loggedin && req.session.username){
		res.render('lobby.ejs',{
			userName : req.session.username
		});
	}else{
		res.render('login.ejs',{
			errorMessage : "You must sign in first!"
		});
	}
});

//rooms are created with the username as the room name
app.post("/createRoom", function(req, res){
	res.redirect(`/chat/${req.session.username}`);
});

app.post("/joinRoom", function(req, res){
	res.redirect(req.body.url);
});

app.get('/chat/:room', function(req, res){
	if(req.session.loggedin && req.session.username){
		res.render('chat.ejs',{
			roomId : req.params.room,
			userName : req.session.username
		});
	}else{
		res.render('login.ejs',{
			errorMessage : "You must sign in first!"
		});
	}
});


app.get('/logOut', async (req, res) => {
	if (req.session) {
		req.session.destroy((err) => {
			if (err) {
				return next(err);
			} else {
				return res.redirect('/');
			}
		});
	}
});

//when connection is established
io.on('connection', function(socket){
	socket.on('joinRoom', (roomId, userName, userId) => {
	//join the room socket
	socket.join(roomId);
	//emitting to the client for the webrtc to begin for the new user joining
	socket.to(roomId).emit('userConnected', userId); 
	
	const user = {
		userName : userName,
		userId : userId,
		roomId : roomId,
		video : true,
		audio: true
	}
	users.push(user);
	//emits the list of active users to the client-side
	function sendUsers(users){
		io.in(roomId).emit("users", users)
	}

	//Calls the function to emit the active users
	sendUsers(users);

	//listening for new messages
	socket.on('input', function(data){
		io.in(data.roomId).emit('messaging', data);
	})

	socket.on('videoOff', function(userName){
		users.forEach( (user) => {
			if(userName === user.userName){
				return user.video = false, user.audio = false;
			}
		})
		sendUsers(users)
	})

	socket.on('videoOn', function(userName){
		users.forEach( (user) => {
			if(userName === user.userName){
				return user.video = true, user.audio = true;
			}
		})
		sendUsers(users)
	})
	
	socket.on("disconnect", () => {
		//Sends event to the client which user left 
		io.in(roomId).emit("userLeft", user, userId, roomId);
		//Removes the username from the "users" array
		users.splice(users.indexOf(user.userName), 1);
		//Calls the function to emit the active users
		sendUsers(users);
		}) 
	});
});

http.listen(80, () => {
	console.log('listening on port: 80');
});
