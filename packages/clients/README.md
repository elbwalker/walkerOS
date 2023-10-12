<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/elbwalker.png' width="256px"/>
  </a>
</p>

# walkerOS Clients: Creating events

## Overview

The walkerOS clients serve as the **data creation** and **state management** layer of your walkerOS infrastructure. Whether you're working on a server-side application with Node.js or a client-side web application, walkerOS clients have got you covered.

## Types of Clients

- [**Node Client**](./node/): Ideal for server-side applications, microservices, and serverless functions.
- [**Web Client** (formerly walker.js)](./web/): Designed for client-side web applications, SPAs, and websites.

## Features

### Common Features

- **Data Creation**: Easily create and format data events.
- **State Management**: Maintain user and session states across events.
- **Consent Handling**: Manage user consent states for GDPR compliance.
- **Event Validation**: Ensure the quality of data through event validation.
- **Dynamic Destinations**: Add or remove data destinations dynamically.

### Node-Specific Features

- **Server-Side Tracking**: Ideal for tracking server-side events.
- **Batch Processing**: Efficiently handle large volumes of data.
- **Data Enrichment**: Enrich data before sending it to destinations.

### Web-Specific Features

- **Client-Side Tracking**: Capture client-side user interactions.
- **Real-Time Analytics**: Get real-time insights into user behavior.
- **Tagging**: Use HTML attributes for easy event tagging.
