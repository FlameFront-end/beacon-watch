import type { JSX } from "react";
import { Link } from "wouter";
import { ArrowRight, Mail, Radio, Webhook } from "lucide-react";

import {
  getDefaultServicePath,
  REGISTERED_SERVICES,
  type RegisteredService,
} from "@/shared/config/services";
import { Badge, Panel } from "@/shared/kit";
import { CallbackCard } from "@/features/callbacks/components/CallbackCard";
import { useCallbackStats } from "@/features/callbacks/hooks/use-callbacks";

import styles from "./Services.module.scss";

export function ServicesPage(): JSX.Element {
  const { stats } = useCallbackStats();

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
            href={getDefaultServicePath(service.key)}
            className={styles.serviceLink}
          >
            <Panel className={styles.serviceCard}>
              <div className={styles.serviceIcon}>
                <ServiceIcon service={service} />
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

      <Panel className={styles.callbackPanel}>
        <div className={styles.callbackHeader}>
          <div className={styles.serviceIcon}>
            <Webhook size={18} aria-hidden="true" />
          </div>
          <div>
            <h2>Callback Events</h2>
            <p>Public exploit callback receiver. {stats?.lastHour ?? 0} event(s) in the last hour.</p>
          </div>
          <Link href="/callbacks" className={styles.callbackLink}>Open</Link>
        </div>
        {stats?.latestFive.length ? (
          <div className={styles.callbackGrid}>
            {stats.latestFive.map((event) => <CallbackCard key={event.id} event={event} />)}
          </div>
        ) : (
          <div className={styles.callbackEmpty}>No callback events yet.</div>
        )}
      </Panel>
    </div>
  );
}

function ServiceIcon({ service }: { readonly service: RegisteredService }): JSX.Element {
  return service.capabilities.includes("beacons")
    ? <Radio size={18} aria-hidden="true" />
    : <Mail size={18} aria-hidden="true" />;
}
