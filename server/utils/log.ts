import { createConsola } from "consola";

const logLevel = useRuntimeConfig().public.logLevel || "1";
const logger = createConsola({
  level: Number(logLevel),
});

export default logger;
