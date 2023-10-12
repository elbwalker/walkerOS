<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/elbwalker.png' width="256px"/>
  </a>
</p>

# walkerOS Stacks: Own Your Data Pipeline

## Overview

Stacks in walkerOS are pre-configured, ready-to-use APIs that serve as the first point of contact for your event data. They are designed to work in your own infrastructure, giving you complete control over data ingestion and processing. While we currently offer a Firebase stack, plans are underway to include more options like AWS.

## What Are Stacks?

Stacks are essentially the backbones of your data collection strategy. They:

1. **Receive Events**: Capture incoming data from clients.
2. **Validate Data**: Ensure the data conforms to your specified formats.
3. **Process Events**: Enrich, transform, or filter the data as needed.
4. **Route Data**: Send the processed data to its final destination.

## Why Use Stacks?

### Complete Ownership

Owning the first point of contact in your data pipeline offers several advantages:

1. **Data Sovereignty**: Keep your data within your jurisdiction, adhering to local and international laws.
2. **Customization**: Implement custom logic for data validation, enrichment, or routing.
3. **Security**: Control who has access to your data.

### Infrastructure

Choose a stack that aligns with your existing infrastructure:

1. [**Firebase Stack**](./firebase/): Ideal for projects already using Firebase services.
2. **AWS Stack** (Coming Soon): More advanced detached setup using AWS nativ services.
3. **Kubernetes** (Coming Soon): Perfect for businesses operating their own infrastructure and clusters.
