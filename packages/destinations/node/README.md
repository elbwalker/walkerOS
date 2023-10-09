# walkerOS Node Destinations

## Why Use Node Destinations

Node destinations in walkerOS offer a flexible and efficient way to handle your server-side event data. Whether you're sending data to a cloud-based data warehouse like BigQuery or to a custom API, node destinations make it easy to configure, initialize, and push your events securely.

## Static Configuration

The static part of the configuration is common across all destinations and is defined in the `NodeDestination.Config` type. It includes properties like:

- `consent`: Required consent states to process events.
- `id`: A unique key for the destination.
- `init`: Indicates if the destination has been initialized and is ready to work.
- `queue`: Option to disable the processing of previously pushed events.

## Custom Configuration

The custom part is specific to each destination and is where you define settings that are unique to the service you are integrating with. Those destinations individual configurations are set in the `custom` field, and are defined in the `CustomConfig` interface.

By structuring the configuration this way, walkerOS provides a flexible yet standardized way to set up any destination, making it easier to manage and extend your data pipeline.

## Functions

### setup

Some destinations may require a `setup` function to be called before they can be used. This function is typically called once to prepare the destination for receiving events.

### init

Before pushing events to a destination, the node client checks for an available `init` function and calls it. This asynchronous function returns either `false` if an error occurs, preventing any events from being processed, or a complete destination `config` that will be used for pushing events.

### push

The node client calls `await destination.push([{ event, mapping }], config);` to send events to destinations. This function is executed after checking for proper consent settings. Events are processed in parallel, and the function supports the batching of multiple events. The mapping parameter is optional and allows for custom event configurations.

## Available destinations

- [BigQuery](./bigquery/)

Feel free to [request a destination](https://github.com/elbwalker/walker.js/issues/new).
