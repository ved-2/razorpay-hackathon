import { describe, expect, it } from "vitest";
import { buildApp } from "../../app";

const app = buildApp();

async function setupTestMerchant() {
  const email = `order-list-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const registerRes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      name: "Order Lister",
      email,
      password: "password123",
      merchantName: "Order List Store",
    },
  });
  const { token, merchant } = registerRes.json();

  const productRes = await app.inject({
    method: "POST",
    url: "/products",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: "Listable Product",
      description: "Test product for listing orders",
    },
  });
  const { product } = productRes.json();

  const variantRes = await app.inject({
    method: "POST",
    url: `/products/${product.id}/variants`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: "Variant Blue",
      sku: `SKU-${Date.now()}`,
      price: 150000,
      currency: "INR",
      quantity: 10,
    },
  });
  const { variant } = variantRes.json();

  return { token, merchant, product, variant };
}

describe("GET /orders and GET /orders/:id", () => {
  it("lists orders and fetches an order by id", async () => {
    const { token, variant } = await setupTestMerchant();

    // 1. Create an order
    const createRes = await app.inject({
      method: "POST",
      url: "/orders",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customer: {
          name: "Alice Walker",
          email: "alice@example.com",
          phone: "+919876543219",
        },
        items: [
          {
            variantId: variant.id,
            quantity: 2,
          },
        ],
      },
    });

    expect(createRes.statusCode).toBe(201);
    const { order } = createRes.json();
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.total).toBe(300000);

    // 2. GET /orders
    const listRes = await app.inject({
      method: "GET",
      url: "/orders",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(listRes.statusCode).toBe(200);
    const listBody = listRes.json();
    expect(listBody.orders).toBeDefined();
    expect(listBody.orders.length).toBe(1);
    expect(listBody.orders[0].id).toBe(order.id);
    expect(listBody.orders[0].customer.name).toBe("Alice Walker");
    expect(listBody.orders[0].items.length).toBe(1);

    // 3. GET /orders/:id
    const getRes = await app.inject({
      method: "GET",
      url: `/orders/${order.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.json();
    expect(getBody.order).toBeDefined();
    expect(getBody.order.id).toBe(order.id);
    expect(getBody.order.customer.email).toBe("alice@example.com");
    expect(getBody.order.items[0].sku).toBe(variant.sku);

    // 4. GET /orders/:id with invalid id returns 404
    const notFoundRes = await app.inject({
      method: "GET",
      url: "/orders/non_existent_id",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(notFoundRes.statusCode).toBe(404);
  });
});
