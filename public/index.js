(function(){
    /////////////////////////////////////////////////
    const query = JSON.parse('{"' + decodeURI(window.location.search.substring(1)).replace(/=/g, '":"').replace(/&/g, '","') + '"}');
    var url = `${window.location.origin}/game?u=${query.u}&type=${query.type}&room=${query.room}` ;
    console.log(url)
    let socket = io(url);

    var myTurn = true;
    var symbol;

    $("#username").text(symbol);

    function getBoardState() {
        var obj = {};

        /* We are creating an object where each attribute corresponds
         to the name of a cell (r0c0, r0c1, ..., r2c2) and its value is
         'X', 'O' or '' (empty).
        */
        $(".board button").each(function () {
            obj[$(this).attr("id")] = $(this).text() || "";
        });

        return obj;
    }

    function isGameOver() {
        var state = getBoardState();
        var matches = ["XXX", "OOO"]; 

        // We are creating a string for each possible winning combination of the cells
        var rows = [
            state.r0c0 + state.r0c1 + state.r0c2, // 1st line
            state.r1c0 + state.r1c1 + state.r1c2, // 2nd line
            state.r2c0 + state.r2c1 + state.r2c2, // 3rd line
            state.r0c0 + state.r1c0 + state.r2c0, // 1st column
            state.r0c1 + state.r1c1 + state.r2c1, // 2nd column
            state.r0c2 + state.r1c2 + state.r2c2, // 3rd column
            state.r0c0 + state.r1c1 + state.r2c2, // Primary diagonal
            state.r0c2 + state.r1c1 + state.r2c0 // Secondary diagonal
        ];

        // Loop through all the rows looking for a match
        for (var i = 0; i < rows.length; i++) {
            if (rows[i] === matches[0] || rows[i] === matches[1]) {
                return true;
            }
        }

        return false;
    }

    function renderTurnMessage() {
        if (!myTurn) { // If not player's turn disable the board
            $("#message").text("Your opponent's turn");
            $(".board button").attr("disabled", true);
        } else { // Enable it otherwise
            $("#message").text("Your turn");
            $(".board button").removeAttr("disabled");
            const newMove = Number($("#moves").text()) + 1;
            $(".moves #moves").text(newMove);
        }
    }

    function makeMove(e) {
        if (!myTurn) {
            return; // Shouldn't happen since the board is disabled
        }

        if ($(this).text().length) {
            return; // If cell is already checked
        }

        socket.emit("make.move", { // Valid move (on client side) -> emit to server
            symbol: symbol,
            position: $(this).attr("id")
        });
    }

    // Bind event on players move
    socket.on("move.made", function (data) {
        $("#" + data.position).text(data.symbol); // Render move

        // If the symbol of the last move was the same as the current player
        // means that now is opponent's turn
        myTurn = data.symbol !== symbol;

        if (!isGameOver()) { // If game isn't over show who's turn is this
            renderTurnMessage();
        } else { // Else show win/lose message
            if (myTurn) {
                // $("#message").text("You lost.");
                const newLoss = Number($("#losses").text()) + 1;
                $("#losses").text(newLoss);
                alert("You Lost!");
                const username = $("#username").text();
                socket.emit("updateLoss", { username:  username, losses: newLoss});
            } else {
                const newWin = Number($("#wins").text()) + 1;
                $("#wins").text(newWin);
                alert("You Won!");
                const username = $("#username").text();
                socket.emit("updateWin", { username:  username, wins: newWin});
            }

            $(".board button").attr("disabled", true); // Disable board
        }
    });


    // Bind event for game begin
    socket.on("game.begin", function (data) {
        symbol = data.symbol; // The server is assigning the symbol
        myTurn = symbol === "X"; // 'X' starts first
        renderTurnMessage();
    });

    socket.on("cannot.join", (data)=>{
        window.location.href = data.destination;
        $(".output").append(`<p><em>${data.message}</em></p>`);
    });

    // Bind on event for opponent leaving the game
    socket.on("opponent.left", function () {
        // $("#message").text("Your opponent left the game.");
        alert("Opponent Left The Game!")
        $(".board button").attr("disabled", true);
    });

    // Binding buttons on the board
    $(function () {
        $(".board button").attr("disabled", true); // Disable board at the beginning
        $(".board> button").on("click", makeMove);
    });

    //sounds configurations
    //theme sound
    var sound = new Howl({
      src: ["/theme_01.mp3"],
      autoplay: 1,
      loop: true
    });
    sound.play();
    var isPlaying = 1;
    $("#toggle_sound").on("click", ()=>{
        if(isPlaying == 1){
            isPlaying = 0;
            sound.stop();
            $("#toggle_sound").text("unmute");
            $("#toggle_sound").removeClass("btn-danger");
            $("#toggle_sound").addClass("btn-success");
        }else{
            isPlaying = 1;
            sound.play();
            $("#toggle_sound").text("mute");
            $("#toggle_sound").removeClass("btn-success");
            $("#toggle_sound").addClass("btn-danger");
        }
    });
    //click sound
    var clicked = new Howl({
      src: [
        "/eatpellet.ogg",
      ],
    });
    $("button").on("click", ()=>{
        clicked.play();
    });

    //communication events
    socket.on("user.join", (data)=>{
        $(".output").append(`<small style="color: #7e7979aa;width: 100%;" class="pl-2"><em>${data}</em></small><br>`);
    })
    socket.on("user.left", (data)=>{
        $(".output").append(`<small style="color: #7e7979aa; width: 100%;" class="pl-2"><em>${data}</em></small><br>`);
    })
    $("#happy").on("click", ()=>{
        socket.emit("reaction", {
            reaction: "😀",
            from: $("#username").text()
        });
    });
    socket.on("reaction", (data) => {
        $(".output").append(`<p><strong>${data.from}: </strong>${data.reaction}</p>`);
    });
    //eyes reaction
    $("#eyes").on("click", ()=>{
        socket.emit("reaction", {
            reaction: "👀",
            from: $("#username").text()
        });
    });

    //love reaction
    $("#love").on("click", ()=>{
        socket.emit("reaction", {
            reaction: "💓",
            from: $("#username").text()
        });
    });
    //clap reaction
    $("#clap").on("click", ()=>{
        socket.emit("reaction", {
            reaction: "👏",
            from: $("#username").text()
        });
    });

    //send a message
    $("#send").on("click", ()=>{
        var msg = $("#chat-message").val();
        socket.emit("message", {
            message: msg,
            from: $("#username").text()
        });
         $("#chat-message").val(" ")
    });

    socket.on("message", (data)=>{
        $(".output").append(`<p><strong>${data.from}: </strong>${data.message}</p>`);
    });
    $("#chat-message").on("change keyup paste", ()=>{
        if($(this).val().length = 0){
            $(".content input[type=submit]").attr("disabled", true);
        }
    });

    //leaderboard
    $(".trigger").on("click", ()=>{
        $(".list #leads").empty();
        if ($(".leader-board .loader").hasClass("spinner-border")){
            $(".leader-board .loader").removeClass("spinner-border")
        }
        else{
            $(".leader-board .loader").addClass("spinner-border")
        }
        $(".leader-board").toggleClass("open");
        socket.emit("getLeaderBoard", "leaderboard");
    });
    socket.on("getLeaderBoard", async (data)=>{
        var leaders = [];
        var bar = 0;
        var size = 0;
        await data.forEach(user=>{
            if (bar <= user.wins) {
                leaders.push(user);
                bar = user.wins;
                size +=1;
            };
        });
        for (var i = size - 1; i >= 0; i--) {
            if ($(".leader-board").hasClass("open")) {
                $(".list #leads").append(`<li style="position: relative;"><strong>${leaders[i].username}</strong> - ${leaders[i].wins}</li>`)
            };
        }
    });
})();