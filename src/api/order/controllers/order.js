"use strict";
// @ts-ignore
const stripe = require("stripe")(
  "sk_test_51NUuxtLa9P4JnSLEWbr43kL1ULWduKtk0jU6FJZPU0JlPx3aUIdURuaZD3fElvFYd0zhVoJjFXmq0SaKiheIlJIS00xDRFLr5U"
);

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

function calculateDiscount(price, discount) {
  if (!discount) return price;
  const discountAmount = (price * discount) / 100;
  const result = price - discountAmount;

  return result.toFixed(2);
}

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async paymentOrder(ctx) {
    const { token, products, user, addressShipping } = ctx.request.body;

    let totalPayment = 0;
    products.forEach((product) => {
      const discount = calculateDiscount(
        product.attributes.price,
        product.attributes.discount
      );
      totalPayment += Number(discount) * product.quantity;
    });

    const charge = await stripe.charges.create({
      amount: Math.round(totalPayment * 100),
      currency: "usd",
      source: token,
      description: `User ID: ${user}`,
    });

    const data = {
      products,
      user,
      totalPayment,
      idPayment: charge.id,
      addressShipping,
    };

    const model = strapi.contentType("api::order.order");
    const validData = await strapi.entityValidator.validateEntityCreation(
      model,
      data
    );

    const entry = await strapi.db
      .query("api::order.order")
      .create({ data: validData });

    return entry;
  },
}));
