const mysql = require("mysql2");
//Database connection
var dbConnect = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "Password4800!",
    database: "LiveChatDB"
  });
  dbConnect.on('error', function(err) {
    console.log("[mysql error]",err)
    if(err){
      console.log("error occured")
    }else{
      console.log("you are connected")
    }
  });
module.exports = dbConnect;