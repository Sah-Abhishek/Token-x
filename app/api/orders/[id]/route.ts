import { NextResponse } from "next/server";
import { requireUser, databaseErrorResponse, PRIVATE_HEADERS } from "@/app/lib/api";
import { cancelOrder } from "@/app/lib/orders";

/** Cancel a resting order and release whatever it was holding. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser("Sign in to cancel an order.");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const result = await cancelOrder(auth.user.id, id);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: result.code === "NOT_FOUND" ? 404 : 409 },
      );
    }

    return NextResponse.json(result, { status: 200, headers: PRIVATE_HEADERS });
  } catch (error) {
    return databaseErrorResponse(error, "The order could not be cancelled.");
  }
}
