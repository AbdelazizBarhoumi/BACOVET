import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/v1/" as never)({
  beforeLoad: () => {
    throw redirect({ to: "/v1/production-confection" });
  },
  component: () => null,
});
