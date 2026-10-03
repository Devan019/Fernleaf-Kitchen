<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ bun install
```

## Compile and run the project

```bash
# development
$ bun run start

# watch mode
$ bun run start:dev

# production mode
$ bun run start:prod
```

## Run tests

```bash
# unit tests
$ bun run test

# e2e tests
$ bun run test:e2e

# test coverage
$ bun run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ bun install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project:

```bash
$ bun install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/overview) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Billing Decisions

### Who pays?
The employee's company pays for confirmed orders. The company is the billing customer; employee payment is not supported. Billing company is derived from `order.companyId` to preserve historical integrity if an employee moves companies.

### When is an order billable?
When it becomes CONFIRMED. Delivery does not need to happen before invoicing.

### Can an order be invoiced twice?
No. A database unique constraint (`InvoiceLine.orderId` `@unique`) strictly prevents an order from belonging to more than one invoice.

### Can orders change after invoicing?
Yes. The operational order may still change according to existing Order and Admin override rules (e.g. cancellations, admin corrections, short deliveries).

### What happens financially?
Invoice lines are immutable financial snapshots storing the unit amount and line amount at invoicing time.
Post-invoice financial differences are represented as explicit debit/credit adjustments (`BillingAdjustment`).
Historical invoice lines and subtotals are never silently mutated.

### What happens when an invoiced order is cancelled?
A credit adjustment (`BillingAdjustmentType.CREDIT`) is created for the full invoiced amount with reason `ORDER_CANCELLED`. The original invoice line remains intact.

### What happens when a delivered order is short?
A credit adjustment (`BillingAdjustmentType.CREDIT`) is created equal to the difference between the invoiced amount and the final billable amount (e.g. 10 meals invoiced at $100, 8 meals delivered at $80 billable total -> $20 credit adjustment).

### What happens when the final amount increases?
A debit adjustment (`BillingAdjustmentType.DEBIT`) is created equal to the positive difference, increasing the net invoice total without overwriting the original line item.

### What happens to paid invoices?
The invoice remains in `PAID` status. Post-payment adjustments are recorded and tracked separately. No external refund or banking gateway integration is implemented.

### Why?
To preserve historical financial accuracy, maintain auditability and traceability, and avoid silently rewriting invoices.

## Settings

### Kitchen working days
Platform-wide kitchen working days define which weekdays the kitchen operates (e.g. `MONDAY` through `FRIDAY`). These weekdays are considered valid working days when calculating cut-off milestones and operational schedules. Weekends or unconfigured weekdays are automatically skipped during backwards calculation.

### Kitchen holidays
Platform-wide kitchen holidays represent specific calendar dates on which the kitchen is closed (e.g., Christmas Day, New Year's Day). These dates are strictly excluded from kitchen working-day calculations. Kitchen holiday dates are unique across the platform.

### Cutoff
Order cut-off determines the deadline by which an order must be placed or edited before it is automatically locked and confirmed.
The cut-off date and time are determined by:
1. Taking the target `deliveryDate` (e.g., Wednesday).
2. Stepping backwards day-by-day to count `cutOffWorkingDays` (e.g., 2 working days), skipping weekends and any registered kitchen holidays.
3. Applying the configured `cutOffTime` (e.g., `16:00` in the application timezone).
For example: For a Wednesday delivery with `cutOffWorkingDays = 2` and `cutOffTime = 16:00`, counting backwards: Tuesday is 1 day, Monday is 2 days -> the cut-off is Monday at 16:00. If Monday is a kitchen holiday, the calculation counts further backward to Friday at 16:00.

### Company vs Kitchen calendar
There are two completely separate calendars in the platform:
- **Company Calendar**: Company-specific working days and holidays. Used exclusively to determine whether a customer company is open and eligible to receive food deliveries on a given date.
- **Kitchen Calendar**: Platform-wide kitchen working days and holidays. Used exclusively to calculate kitchen production schedules and order cut-off deadlines.
The Company calendar never alters order cut-off calculations, and the Kitchen calendar never determines whether an individual customer company is open.

### Configuration
Authorized staff (`ADMIN` role) can modify all operational settings (working days, cut-off time, cut-off working-day count, platform timezone) and manage kitchen holidays (create, list, update, delete) via the Admin Panel and backend REST APIs (`/settings/kitchen`, `/settings/kitchen/holidays`). Staff do not need to edit source code, environment variables, database schemas, or database tables manually. Changes take effect immediately for future calculations without requiring an application restart.

