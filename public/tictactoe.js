var TicTacToe = {
    gameId: null,
    turn: null,
    i: false,
    interval: null,
    init: function() {
        $(function() {
            var socket = io();
            $('#reload').hide().click(function() {
                $('#reload').off('click').click(function(){window.location.reload();});
                socket.emit('start');
            });
            $('#send').click(function(){
                var message = $('input').val();
                socket.emit('message', message);
                $('input').val(null);
            });
            socket.on('connect', function () {
                $('#status').html('Успешно подключились к игровому серверу');
                $('#reload').show();
            });
            socket.on('userName', function(userName){
                console.log('You\'r username is => ' + userName);
                $('textarea').val($('textarea').val() + 'You\'r username => ' + userName + '\n');
            });

            socket.on('newUser', function(userName){
                console.log('New user has been connected to chat | ' + userName);
                $('textarea').val($('textarea').val() + userName + ' connected!\n');
            });
            socket.on('messageToClients', function(msg, name){
                console.log(name + ' | => ' + msg);
                $('textarea').val($('textarea').val() + name + ' : '+ msg +'\n');
            });
            socket.on('reconnect', function () {
                $('#reload').show();
                $('#connect-status').html('Переподключились, продолжайте игру');
            });
            socket.on('reconnecting', function () {
                $('#reload').hide();
                $('#status').html('Соединение с сервером потеряно, переподключаемся...');
            });
            socket.on('error', function (e) {
                $('#status').html('Ошибка: ' + (e ? e : 'неизвестная ошибка'));
            });
            socket.on('wait', function(){
                $('#status').append('... Ожидаем соперника...');
            });
            socket.on('exit', function(){
                TicTacToe.endGame(TicTacToe.turn, 'exit');
            });
            socket.on('timeout', function(turn) {
                TicTacToe.endGame(turn, 'timeout');
            });
            socket.on('ready', function(gameId, turn, x, y) {
                $('#status').html('К вам подключился соперник! Игра началась! ' + (turn == 'X' ? 'Сейчас Ваш первый ход' : 'Сейчас ходит соперник') + '!');
                TicTacToe.startGame(gameId, turn, x, y);
                $('#stats').append($('<div/>').attr('class', 'turn ui-state-hover ui-corner-all').html('Вы играете: <b>' + (turn=='X'?'Крестиком':'Ноликом') + '</b>'));
                $("#board-table td").click(function (e) {
                    if(TicTacToe.i) socket.emit('step', TicTacToe.gameId, e.target.id);
                }).hover(function(){
                    $(this).toggleClass('ui-state-hover');
                }, function(){
                    $(this).toggleClass('ui-state-hover');
                });
            });
            socket.on('step', function(id, turn, win) {
                TicTacToe.move(id, turn, win);
            });
            socket.on('stats', function (arr) {
                var stats = $('#stats');
                stats.find('div').not('.turn').remove();
                for(val in arr) {
                    stats.prepend($('<div/>').attr('class', 'ui-state-hover ui-corner-all').html(arr[val]));
                }
            });
        });
    },

    startGame: function (gameId, turn, x, y) {
        this.gameId = gameId;
        this.turn = turn;
        this.i = (turn == 'X');
        var table = $('#board-table').empty();
        for(var i = 1; i <= 3; i++) {
            var tr = $('<tr/>');
            for(var j = 0; j < 3; j++) {
                tr.append($('<td/>').attr('id', (j+1) + 'x' + i).addClass('ui-state-default').html('&nbsp;'));
            }
            table.append(tr);
        }
        $("#board,#timerpanel").show();
        this.mask(!this.i);
    },

    mask: function(state) {
        var mask = $('#masked'), board = $('#board-table');
        clearInterval(this.interval);
        $('#timer').html(15);
        this.interval = setInterval(function(){
            var i = parseInt($('#timer').html()); i--;
            $('#timer').html(i);
        }, 1000);
        if(state) {
            mask.show();
            var p = board.position();
            mask.css({
                width: board.width(),
                height: board.height(),
                left: p.left,
                top: p.top
            });
        } else {
            mask.hide();
        }
    },

    move: function (id, turn, win) {
        this.i = (turn != this.turn);
        $("#" + id).attr('class', 'ui-state-hover').html(turn);
        if (!win) {
            this.mask(!this.i);
            $('#status').html('Сейчас ' + (this.i ? 'ваш ход' : 'ходит соперник'));
        } else {
            this.endGame(turn, win);
        }
    },

    endGame: function (turn, win) {
        clearInterval(this.interval);
        var text = '';
        switch(win) {
            case 'none': text = 'Ничья!'; break;
            case 'timeout': text = (turn == this.turn ? 'Слишком долго думали! Вы проиграли!' : 'Соперник так и не смог решить как ему ходить! Вы победили!'); break;
            case 'exit': text = 'Соперник сбежал с поля боя! Игра закончена'; break;
            default: text = 'Вы ' + (this.i ? 'проиграли! =(' : 'выиграли! =)');
        }
        $("<div/>").html(text).dialog({
            title: 'Конец игры',
            modal: true,
            closeOnEscape: false,
            resizable: false,
            buttons: { "Играть по новой": function() {
                $(this).dialog("close");
                window.location.reload();
            }},
            close: function() {
                window.location.reload();
            }
        });
    }
};

