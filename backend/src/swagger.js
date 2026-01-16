const swaggerJSDoc = require("swagger-jsdoc");

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Portal RT API",
      version: "0.1.0",
      description: "Dokumentasi API tahap awal Portal RT."
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Server lokal"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  },
  apis: ["./src/routes/*.js"]
});

module.exports = { swaggerSpec };
