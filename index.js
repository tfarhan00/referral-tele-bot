import "./dotenv.js";

import fastifyCors from "@fastify/cors";
import Fastify from "fastify";
import { telegramWorkers } from "./telegram/telegramWorkers.js";

const fastify = Fastify({
  logger: false,
});

fastify.register(fastifyCors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

/* --------------------------------- Workers -------------------------------- */
fastify.register(telegramWorkers);

const start = async () => {
  try {
    const port = process.env.APP_PORT || 3075;
    await fastify.listen({
      port: port,
      host: "0.0.0.0",
    });

    console.log(
      `Server is listening on port http://localhost:${
        fastify.server.address().port
      }`
    );
  } catch (error) {
    console.log("Error starting server: ", error);
    process.exit(1);
  }
};

start();
