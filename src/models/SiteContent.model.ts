import { Schema, models, model } from "mongoose";

const footerLinkSchema = new Schema(
  {
    label: { type: String, required: true },
    href: { type: String, required: true },
  },
  { _id: false }
);

const siteContentSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    heroTitle: { type: String, default: "" },
    heroSubtitle: { type: String, default: "" },
    announcementBar: { type: String, default: "" },
    promoBanner: { type: String, default: "" },
    faqMarkdown: { type: String, default: "" },
    termsMarkdown: { type: String, default: "" },
    footerLinks: { type: [footerLinkSchema], default: [] },
  },
  { timestamps: true }
);

export const SiteContent = models.SiteContent || model("SiteContent", siteContentSchema);
