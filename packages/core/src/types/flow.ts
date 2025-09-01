export interface Config {
  nodes: Node[];
  edges: Edge[];
  packages: Package[];
}

export interface Node {
  id: string;
  type: PackageType;
  package: string;
  config: Record<string, unknown>;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}

export interface Package {
  id: string;
  name: string;
  version: string;
  type: PackageType;
}

export type PackageType = 'core' | 'collector' | 'source' | 'destination';
