import { Router } from "express";

const routes = new Router();

routes.get("/", (req, res) => {
	return res.json({ ola: "mundo" });
});

export default routes;
