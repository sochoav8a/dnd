import { GraphQLScalarType, Kind } from "graphql";

export const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      try { return JSON.parse(ast.value); } catch { return ast.value; }
    }
    return null;
  },
});

export const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO 8601 date-time string",
  serialize: (value) => {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") return value;
    return null;
  },
  parseValue: (value) => {
    if (typeof value === "string") return new Date(value);
    return null;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) return new Date(ast.value);
    return null;
  },
});
