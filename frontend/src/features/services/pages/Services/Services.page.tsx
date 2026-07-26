import type { JSX } from "react";
import { Link } from "wouter";
import { ArrowRight, Mail, Radio } from "lucide-react";

import { REGISTERED_SERVICES } from "@/shared/config/services";
import { Badge, Panel } from "@/shared/kit";

import styles from "./Services.module.scss";

export function ServicesPage(): JSX.Element {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1>Services</h1>
          <p>Select a monitored service. Beacon and captured email records stay scoped to the selected service.</p>
        </div>
        <Badge tone="neutral">{REGISTERED_SERVICES.length} active</Badge>
      </section>

      <div className={styles.grid}>
        {REGISTERED_SERVICES.map((service) => (
          <Link
            key={service.key}
            href={`/${service.key}/beacons`}
            className={styles.serviceLink}
          >
            <Panel className={styles.serviceCard}>
              <div className={styles.serviceIcon}>
                <Radio size={18} aria-hidden="true" />
              </div>
              <div className={styles.serviceBody}>
                <h2>{service.name}</h2>
                <p>{service.description}</p>
                <div className={styles.capabilities}>
                  {service.capabilities.map((capability) => (
                    <Badge key={capability} tone="neutral">
                      {capability}
                    </Badge>
                  ))}
                </div>
              </div>
              <ArrowRight size={18} aria-hidden="true" />
            </Panel>
          </Link>
        ))}
      </div>

      <Link href="/smtp" className={styles.serviceLink}>
        <Panel className={styles.smtpPanel}>
          <div className={styles.serviceIcon}>
            <Mail size={18} aria-hidden="true" />
          </div>
          <div>
            <h2>Global SMTP</h2>
            <p>Shared relay settings and manual email delivery live outside individual service scopes.</p>
          </div>
          <ArrowRight size={18} aria-hidden="true" />
        </Panel>
      </Link>
    </div>
  );
}
