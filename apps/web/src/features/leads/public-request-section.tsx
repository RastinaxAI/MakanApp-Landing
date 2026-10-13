import { Container } from "@/components/layout/container";
import { ContactChannels } from "@/components/marketing/contact-channels";
import { RequestForm } from "./request-form";

// Keep form validation and its client bundle in the two routes that render a form.
export function PublicRequestSection({ kind }: { kind: "demo" | "contact" }) {
  return (
    <section className="section-space">
      <Container className="grid items-start gap-8 desktop:grid-cols-[1.35fr_1fr]">
        <RequestForm kind={kind} />
        <ContactChannels />
      </Container>
    </section>
  );
}
