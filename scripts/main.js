const socket = io();

document.getElementById("currentRoom").innerHTML = "Share your room: " + window.location.href;
socket.on("users", (users) => {
    let activeUsersUl = document.getElementById("activeUsers");
    activeUsersUl.innerHTML = ' ';
    users.forEach((user) => {
        if(user.roomId === roomId){
            let newUserLi = document.createElement("li");
            newUserLi.innerHTML = `${user.userName}`;
            activeUsersUl.appendChild(newUserLi);
        }
    })
    users = users.filter(user => user.roomId === roomId)
    let onlineNum = users.length
    document.getElementById("currentlyOnline").innerHTML = onlineNum + " Currently Online";
})

document.getElementById('input').addEventListener("keydown", function (e) {
    if(e.key === "Enter") { 
        var text = e.target.value; 
        newEntry();
    }
})

// Pulls message from input container and emits to server
function newEntry(){
    var input = document.getElementById("input").value;
    //sends user's input to the server side
    if(input){
        socket.emit('input', {
            "roomId" : roomId,
            "input" :  input,
            "userName" : userName 
        });
    }
}

//Message from sever
socket.on('messaging', function (data){
    if(userName == data.userName){
        const messages = document.getElementById("messaging");
        let newMessageContainer = document.createElement("p");
        newMessageContainer.id = 'sentMessage';
        newMessageContainer.innerHTML =  data.userName + ": " + data.input;
        messages.appendChild(newMessageContainer);

        //Scrolls to the messages when new entry is sent 
        messages.scrollTop = messages.scrollHeight;
        //deletes the last message the user sent 
        document.getElementById("input").value = " ";
        //brings focus back to input form
        document.getElementById("input").focus();
    }else{
        const messages = document.getElementById("messaging");
        let newMessageContainer = document.createElement("p");
        newMessageContainer.id = 'recievedMessage';
        newMessageContainer.innerHTML =  data.userName + ": " + data.input;
        messages.appendChild(newMessageContainer);

        //Scrolls to the messages when new entry is sent 
        messages.scrollTop = messages.scrollHeight;
        //deletes the last message the user sent 
        document.getElementById("input").value = " ";
        //brings focus back to input form
        document.getElementById("input").focus();
    }
})

socket.on('userLeft', function(user, userId, roomId){	
    if(roomId == roomId){
        let leftMessage = document.getElementById("messaging");
        let leftMessageContainer = document.createElement("p");
        leftMessageContainer.innerHTML = "CHATBOT: "  + user.userName + " has left the chat";
        leftMessageContainer.id = 'recievedMessage';
        leftMessage.appendChild(leftMessageContainer);

        //Scrolls to the messages when new entry is sent 
        leftMessage.scrollTop = leftMessage.scrollHeight;

        //close peer connection 
        if (peers[userId]){
            peers[userId].close()
        }
    }
})

const videoContainer = document.getElementById('videoContainer')
const myPeer = new Peer();
const myVideo = document.createElement('video')
myVideo.muted = true
let myStream;
const peers = {}
navigator.mediaDevices.getUserMedia({
video: true,
audio: true
}).then(stream => {
    addVideoStream(myVideo, stream)
    myStream = stream;
    myPeer.on('call', call => {
        call.answer(stream)
        const video = document.createElement('video')
        call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream)
        })
    })
    socket.on('userConnected', userId => {
        // user is joining
        setTimeout(() => {
            // user joined
            connectToNewUser(userId, stream)
        }, 1000)
    })
})


myPeer.on('open', userId => {
    socket.emit('joinRoom', roomId, userName, userId)
})

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream)
    })
    call.on('close', () => {
        video.remove()
    })
    peers[userId] = call
}

function addVideoStream(video, stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoContainer.append(video)
}

//opens and closes user's vidoe display
function videoControl( ){
    const enabled = myStream.getVideoTracks()[0].enabled;
    if(enabled){
        document.getElementById("videoControlBtn").innerHTML = "Show Video"
        const enabled = myStream.getVideoTracks()[0].enabled = false;
        socket.emit("videoOff", userName);
    }else{
        document.getElementById("videoControlBtn").innerHTML = "Turn Off Video";
        const enabled = myStream.getVideoTracks()[0].enabled = true;
        socket.emit("videoOn", userName);
    }	
}

//opens and closes user's chat display
function openCloseChat(){
    var chat = document.getElementById("rightContainer");
    var chatBtn = document.getElementById("chatBtn");
    if(chat.style.display === "none"){
        chat.style.display = "block";
        document.getElementById("leftContainer").style.width = "60%";
        chatBtn.innerHTML = "Close Chat";
    }
    else{
        chat.style.display = "none";
        document.getElementById("leftContainer").style.width = "100%";
        chatBtn.innerHTML = "Open Chat";
    }
}