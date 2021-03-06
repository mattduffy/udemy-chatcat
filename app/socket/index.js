'use strict';
const h = require('../helpers');

module.exports = (io, app)=>{
  let allrooms = app.locals.chatrooms;

  io.of('/roomlist').on('connection', (socket)=>{
    console.log("client has connected. ");
    socket.on('getChatrooms', ()=>{
      socket.emit('chatRoomsList', JSON.stringify(allrooms));
    });
    socket.on('createNewRoom', (data)=>{
      console.log('createNewRoom: ', data);
      if(!h.findRoomByName(allrooms, data.newRoom)){
        allrooms.push({
          'room': data.newRoom,
          'roomId': h.randomHex(),
          'users': []
        });
        console.log(allrooms );
        // Emit updated room list to room creator.
        socket.emit('chatRoomsList', JSON.stringify(allrooms));
        // Emit update room list to all other chatcat users.
        socket.broadcast.emit('chatRoomsList', JSON.stringify(allrooms));
      } else {
        // Room name is already in use.
        socket.emit('err', {
          'msg': `"${data.newRoom} is already in use. Pick a new room name."`
        });
      }
    });
  });

  io.of('/chatter').on('connection', (socket)=>{
    // Listen for events on the chatter namespace for messages in an individual chat room.
    console.log("client has connected to chatter.");
    socket.on('join', (data)=>{
      //console.log("somebody joined a room: ", data);
      let userList = h.addUserToRoom(allrooms, data, socket);
      console.log("userList: ", userList);
      // broadcast emit the updated userlist to all users connected to this room.
      socket.broadcast.to(data.roomId).emit('updateUsersList', JSON.stringify(userList));
      socket.emit('updateUsersList', JSON.stringify(userList));
    });

    // New message event
    socket.on('newMessage', (data)=>{
      socket.broadcast.to(data.roomId).emit('inMessage', JSON.stringify(data));
    });

    // Disconnect when a user leaves the chatroom
    socket.on('Disconnect', ()=>{
      // Find the room to which the user is connected and purge the user.
      let room = h.removeUserFromRoom(allrooms, socket);
      socket.broadcast.to(room.roomId).emit('updateUsersList', JSON.stringify(room.users));
    });
  });
};
