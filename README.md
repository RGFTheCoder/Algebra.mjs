# Algebra.mjs

I was trying to use [Algebra.js](https://github.com/nicolewhite/algebra.js) with [QuickJS](https://bellard.org/quickjs/), but QuickJS uses the EcmaScript module system. I decided to use some regexes to convert the source to modern es6 version.

## Changes made:
* Replace `var` with `let`
* Reform constructor-prototype classes into es6 `class`es
* Remove `require` calls and replace them with `import`s
* Create `mod.js` which exports everything
* The default parser is stored in `parser.js` as the export `_defParser`

## Modified ReadMe

# algebra.mjs 

## Quick Start

```js
const expr = new Expression("x");
expr = expr.subtract(3);
expr = expr.add("x");

console.log(expr.toString());
```

```
2x - 3
```

```js
const eq = new Equation(expr, 4);

console.log(eq.toString());
```

```
2x - 3 = 4
```

```js
const x = eq.solveFor("x");

console.log("x = " + x.toString());
```

```
x = 7/2
```

[Read the full documentation at the project site](http://algebra.js.org).

## Install

### Stable Release

#### In the Browser

```js
import * as Algebra from 'mod.js';
```

### Latest Development Release

```
git clone https://github.com/RGFTheCoder/Algebra.mjs.git
cd Algebra.mjs
```

#### In Node

```js
import * as algebra from './algebra.js';
```
