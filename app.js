const express = require("express");
const app = express();
const http = require("http");
const socketio = require("socket.io");
const path = require("path");

const server = http.createServer(app);
const io = socketio(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index");
});

// Store latest location of each user
const userLocations = {};

io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    // Send all existing users' locations to the new user
    for (let id in userLocations) {
        socket.emit("receive-location", {
            id,
            ...userLocations[id]
        });
    }

    // When a user shares their location
    socket.on("send-location", (data) => {
        userLocations[socket.id] = data;

        // Send to everyone (including self)
        io.emit("receive-location", {
            id: socket.id,
            ...data
        });
    });

    // When a user disconnects
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        delete userLocations[socket.id];
        io.emit("user-disconnected", socket.id);
    });
});

server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
