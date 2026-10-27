import { test } from "node:test";
import assert from "node:assert/strict";
import { contentRequirements } from "../../src/features/cms/content-requirements.ts";

const node = (type, props = {}, children = []) => ({ type, props, children });
const page = (nodes) => ({ kind: "page", document: { nodes } });

test("a text page and a feature index do not request unrelated catalogues", () => {
  assert.deepEqual(
    contentRequirements(page([node("Heading"), node("RichText")])),
    { features: false, audiences: false, faqs: false },
  );
  assert.deepEqual(
    contentRequirements(page([node("Heading"), node("FeatureIndex")])),
    { features: true, audiences: false, faqs: false },
  );
});

test("nested widgets and legacy sections retain their live content dependencies", () => {
  const payload = page([
    node("Container", {}, [
      node("AudienceIndex"),
      node("FAQ"),
      node("LegacySection", { legacy_section: { type: "experience" } }),
    ]),
  ]);
  assert.deepEqual(contentRequirements(payload), {
    features: true,
    audiences: true,
    faqs: true,
  });
});

test("custom feature cards do not need a catalogue; automatic cards still do", () => {
  assert.equal(
    contentRequirements(
      page([node("Features", { items: [{ title: "custom" }] })]),
    ).features,
    false,
  );
  assert.equal(contentRequirements(page([node("Features")])).features, true);
  assert.equal(
    contentRequirements(page([node("FeatureStory")])).features,
    true,
  );
  assert.equal(
    contentRequirements(page([node("ProductShowcase")])).features,
    true,
  );
});

test("legacy home and audience pages retain all required references", () => {
  assert.deepEqual(
    contentRequirements({
      kind: "home",
      sections: [
        { type: "features" },
        { type: "audiences" },
        { type: "trust" },
      ],
    }),
    { features: true, audiences: true, faqs: true },
  );
  assert.equal(contentRequirements({ kind: "audience" }).features, true);
  assert.deepEqual(contentRequirements({ kind: "feature" }), {
    features: false,
    audiences: false,
    faqs: false,
  });
});
