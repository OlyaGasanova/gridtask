var express = require('express'), app =  express(),
   TicTacToe = require('./models/tictactoe');
const socketIO = require('socket.io');
app.use(express.static(__dirname + '/public'));
var port = process.env.PORT || 1337;
var  server = app.listen(port);
const io = socketIO(server);

//io.set('resource', '/api');
var countGames = 0, countPlayers = [], Game = new TicTacToe();
Game.x = Game.y = 6;
Game.stepsToWin = 4;

setInterval(function() {
    io.emit('stats', [
        'Всего игр: ' + countGames,
        'Уникальных игроков: ' + Object.keys(countPlayers).length,
        'Сейчас игр: ' + Object.keys(Game.games).length,
        'Сейчас игроков: ' + Object.keys(Game.users).length
    ]);
}, 5000);



io.on('connection', function (socket) {
    console.log('%s: %s - connected', socket.id.toString(), socket.handshake.address.address);
    if(countPlayers[socket.handshake.address.address] == undefined) countPlayers[socket.handshake.address.address] = true;

    var name = 'U' + (socket.id).toString().substr(1,4);
    socket.broadcast.emit('newUser', name);
    socket.emit('userName', name);
   console.log(name + ' connected to chat!');
    io.emit('stats', [
        'Всего игр: ' + countGames,
        'Уникальных игроков: ' + Object.keys(countPlayers).length,
        'Сейчас игр: ' + Object.keys(Game.games).length,
        'Сейчас игроков: ' + Object.keys(Game.users).length
    ]);

    function closeRoom(gameId, opponent) {
        socket.leave(gameId);
        var socket2= io.connected[opponent];
        socket2.leave(gameId);
        countGames--;
    }

    socket.on('message', function(msg){
        console.log('-----------');
        console.log('User: ' + name + ' | Message: ' + msg);
        console.log('====> Sending message to other chaters...');
        io.emit('messageToClients', msg, name);
    });

    socket.on('start', function () {
        if(Game.users[socket.id] !== undefined) return;
        Game.start(socket.id.toString(), function(start, gameId, opponent, x, y){
            if(start) {
                Game.games[gameId].on('timeout', function(user) {
                    Game.end(user, function(gameId, opponent, turn) {
                        io.sockets.in(gameId).emit('timeout', turn);
                        closeRoom(gameId, opponent);
                    });
                });

                socket.join(gameId);
                var socket2= io.sockets.connected[opponent];
                socket2.join(gameId);
                socket.emit('ready', gameId, 'X', x, y);
                io.to(opponent).emit('ready', gameId, 'O', x, y);
                countGames++;
            } else {
                io.to(socket.id).emit('wait');
            }
        });
    });

    socket.on('step', function (gameId, id) {
        if(Game.games[gameId] === undefined) return;
        var coordinates = id.split('x');
        Game.step(gameId, parseInt(coordinates[0]), parseInt(coordinates[1]), socket.id.toString(), function(win, turn) {
            io.sockets.in(gameId).emit('step', id, turn, win);
            if(win) {
                Game.end(socket.id.toString(), function(gameId, opponent){
                    closeRoom(gameId, opponent);
                });
            }
        });
    });

    socket.on('disconnect', function () {
        Game.end(socket.id.toString(), function(gameId, opponent) {
            io.to(opponent).emit('exit');
            closeRoom(gameId, opponent);
        });
        console.log('%s: %s - disconnected', socket.id.toString(), socket.handshake.address.address);
    });

});