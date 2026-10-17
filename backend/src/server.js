const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const jwt = require("jsonwebtoken");
const ChatMessage = require("./models/ChatMessage");
const User = require("./models/User");
const { ensureRoomForOrder, isParticipant } = require("./services/chatService");
const { runDueSubscriptions } = require("./services/subscriptionService");

connectDB(); 

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Unauthorized"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    User.findById(decoded.id)
      .then((user) => {
        if (!user) return next(new Error("Unauthorized"));
        socket.user = { id: user._id.toString(), role: user.role, name: user.name };
        next();
      })
      .catch(() => next(new Error("Unauthorized")));
  } catch (error) {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.on("join_order", async ({ orderId }) => {
    try {
      const room = await ensureRoomForOrder(orderId);
      if (!isParticipant(room, socket.user.id)) return;
      socket.join(room._id.toString());
      socket.emit("joined_room", { roomId: room._id });
    } catch (error) {
      socket.emit("error_message", { message: error.message });
    }
  });

  socket.on("send_message", async ({ orderId, content }) => {
    try {
      const room = await ensureRoomForOrder(orderId);
      if (room.isDisabled) return;
      if (!isParticipant(room, socket.user.id)) return;
      const message = await ChatMessage.create({
        roomId: room._id,
        orderId,
        senderId: socket.user.id,
        senderRole: socket.user.role,
        senderName: socket.user.name,
        content,
        type: "text",
        readBy: [socket.user.id]
      });
      io.to(room._id.toString()).emit("new_message", message);
    } catch (error) {
      socket.emit("error_message", { message: error.message });
    }
  });

  socket.on("mark_read", async ({ orderId, messageId }) => {
    const room = await ensureRoomForOrder(orderId);
    if (!isParticipant(room, socket.user.id)) return;
    await ChatMessage.updateOne(
      { _id: messageId },
      { $addToSet: { readBy: socket.user.id } }
    );
  });

});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

setInterval(() => {
  runDueSubscriptions().catch(() => {});
}, 60 * 60 * 1000);
