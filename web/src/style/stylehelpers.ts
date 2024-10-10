/**
 * A simple set of helper functions to make writing Maplibre GL styles in JS/TS a bit more pleasant.
 *
 * These functions simply reproduce the expressions from the style spec. They don't offer much
 * (if any) improvement in terms of correctness or typechecking - the Maplibre library is really
 * good at that - but they do make the code much more pleasant  to read, especially when using
 * syntax highlighting and autoformatting.
 */
import {
  ExpressionSpecification,
  InterpolationSpecification,
  ExpressionInputType,
  ColorSpecification
} from 'maplibre-gl'

/**
 * Produces continuous, smooth results by interpolating between pairs of input and output
 * values ("stops").
 *
 * @param property any numeric expression
 * @param stops an array of [stop, value] pairs
 * @param base the base of the interpolation (1 if linear)
 */
export function interpolate(
  property: number | ExpressionSpecification,
  stops: [number, number | number[] | ColorSpecification | ExpressionSpecification][],
  base = 1
): ExpressionSpecification {
  let method: InterpolationSpecification = ['linear']
  if (base != 1) {
    method = ['exponential', base]
  }

  return ['interpolate', method, property, ...stops.flat()]
}

/**
 * Produces discrete, stepped results by evaluating a piecewise-constant function defined by pairs
 * of input and output values ("stops").
 *
 * @param property any numeric expression
 * @param defaultValue the value to be returned if the input is less than the first stop value
 * @param stops an array of [stop, value] pairs
 */
export function step(
  property: ExpressionSpecification,
  defaultValue: ExpressionInputType | ExpressionSpecification,
  stops: [number, ExpressionInputType | ExpressionSpecification][]
): ExpressionSpecification {
  return ['step', property, defaultValue, ...stops.flat()]
}

/**
 * Selects the first output whose corresponding test condition evaluates to true, or the fallback value otherwise.
 */
export function case_(
  branches: [boolean | ExpressionSpecification, ExpressionInputType | ExpressionSpecification][],
  fallback: ExpressionInputType | ExpressionSpecification
): ExpressionSpecification {
  // The following contortion is required to satisfy the typechecker.
  const cases_flat = branches.slice(1).flat() as (boolean | ExpressionInputType | ExpressionSpecification)[]
  return ['case', branches[0][0], branches[0][1], ...cases_flat, fallback]
}

/**
 * Helper for a single-branch case statement.
 *
 * @param condition expression to test
 * @param then return value if expression is true
 * @param else_ return value if expression is false
 */
export function if_(
  condition: boolean | ExpressionSpecification,
  then: ExpressionInputType | ExpressionSpecification,
  else_: ExpressionInputType | ExpressionSpecification
): ExpressionSpecification {
  return ['case', condition, then, else_]
}

export function match(
  property: ExpressionInputType | ExpressionSpecification,
  cases: [ExpressionInputType | ExpressionInputType[], ExpressionInputType | ExpressionSpecification][],
  fallback: ExpressionInputType | ExpressionSpecification
): ExpressionSpecification {
  // The following contortion is required to satisfy the typechecker.
  const cases_flat = cases.slice(1).flat() as (
    | ExpressionInputType
    | ExpressionInputType[]
    | ExpressionSpecification
  )[]
  return ['match', property, cases[0][0], cases[0][1], ...cases_flat, fallback]
}

export function literal(value: any): ExpressionSpecification {
  return ['literal', value]
}

export function get(property: string): ExpressionSpecification {
  return ['get', property]
}

export function has(property: string): ExpressionSpecification {
  return ['has', property]
}

export function any(...expressions: (boolean | ExpressionSpecification)[]): ExpressionSpecification {
  return ['any', ...expressions]
}

export function all(...expressions: (boolean | ExpressionSpecification)[]): ExpressionSpecification {
  return ['all', ...expressions]
}

export function not(expression: boolean | ExpressionSpecification): ExpressionSpecification {
  return ['!', expression]
}

export function concat(
  ...expressions: (ExpressionInputType | ExpressionSpecification)[]
): ExpressionSpecification {
  return ['concat', ...expressions]
}

export function coalesce(
  ...expressions: (ExpressionInputType | ExpressionSpecification)[]
): ExpressionSpecification {
  return ['coalesce', ...expressions]
}

export const zoom: ExpressionSpecification = ['zoom']

export function round(field: ExpressionSpecification, places: number): ExpressionSpecification {
  const pow = Math.pow(10, places)
  return ['/', ['round', ['*', field, pow]], pow]
}
