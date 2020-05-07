import { Fraction } from './fractions.js';
import { isInt } from './helper.js';
import { GREEK_LETTERS } from './helper.js';

export class Expression {
  constructor(variable) {
    this.constants = [];

    if (typeof variable === 'string') {
      let v = new Variable(variable);
      let t = new Term(v);
      this.terms = [t];
    } else if (isInt(variable)) {
      this.constants = [new Fraction(variable, 1)];
      this.terms = [];
    } else if (variable instanceof Fraction) {
      this.constants = [variable];
      this.terms = [];
    } else if (variable instanceof Term) {
      this.terms = [variable];
    } else if (typeof variable === 'undefined') {
      this.terms = [];
    } else {
      throw new TypeError(
        'Invalid Argument (' +
          variable.toString() +
          '): Argument must be of type String, Integer, Fraction or Term.'
      );
    }
  }

  constant() {
    return this.constants.reduce(function (p, c) {
      return p.add(c);
    }, new Fraction(0, 1));
  }

  simplify() {
    let copy = this.copy();

    //simplify all terms
    copy.terms = copy.terms.map(function (t) {
      return t.simplify();
    });

    copy._sort();
    copy._combineLikeTerms();
    copy._moveTermsWithDegreeZeroToConstants();
    copy._removeTermsWithCoefficientZero();
    copy.constants = copy.constant().valueOf() === 0 ? [] : [copy.constant()];

    return copy;
  }

  copy() {
    let copy = new Expression();

    //copy all constants
    copy.constants = this.constants.map(function (c) {
      return c.copy();
    });
    //copy all terms
    copy.terms = this.terms.map(function (t) {
      return t.copy();
    });

    return copy;
  }

  add(a, simplify) {
    let thisExp = this.copy();

    if (
      typeof a === 'string' ||
      a instanceof Term ||
      isInt(a) ||
      a instanceof Fraction
    ) {
      let exp = new Expression(a);
      return thisExp.add(exp, simplify);
    } else if (a instanceof Expression) {
      let keepTerms = a.copy().terms;

      thisExp.terms = thisExp.terms.concat(keepTerms);
      thisExp.constants = thisExp.constants.concat(a.constants);
      thisExp._sort();
    } else {
      throw new TypeError(
        'Invalid Argument (' +
          a.toString() +
          '): Summand must be of type String, Expression, Term, Fraction or Integer.'
      );
    }

    return simplify || simplify === undefined ? thisExp.simplify() : thisExp;
  }

  subtract(a, simplify) {
    let negative =
      a instanceof Expression ? a.multiply(-1) : new Expression(a).multiply(-1);
    return this.add(negative, simplify);
  }

  multiply(a, simplify) {
    let thisExp = this.copy();

    if (
      typeof a === 'string' ||
      a instanceof Term ||
      isInt(a) ||
      a instanceof Fraction
    ) {
      let exp = new Expression(a);
      return thisExp.multiply(exp, simplify);
    } else if (a instanceof Expression) {
      let thatExp = a.copy();
      let newTerms = [];

      for (let i = 0; i < thisExp.terms.length; i++) {
        let thisTerm = thisExp.terms[i];

        for (let j = 0; j < thatExp.terms.length; j++) {
          let thatTerm = thatExp.terms[j];
          newTerms.push(thisTerm.multiply(thatTerm, simplify));
        }

        for (let j = 0; j < thatExp.constants.length; j++) {
          newTerms.push(thisTerm.multiply(thatExp.constants[j], simplify));
        }
      }

      for (let i = 0; i < thatExp.terms.length; i++) {
        let thatTerm = thatExp.terms[i];

        for (let j = 0; j < thisExp.constants.length; j++) {
          newTerms.push(thatTerm.multiply(thisExp.constants[j], simplify));
        }
      }

      let newConstants = [];

      for (let i = 0; i < thisExp.constants.length; i++) {
        let thisConst = thisExp.constants[i];

        for (let j = 0; j < thatExp.constants.length; j++) {
          let thatConst = thatExp.constants[j];
          let t = new Term();
          t = t.multiply(thatConst, false);
          t = t.multiply(thisConst, false);
          newTerms.push(t);
        }
      }

      thisExp.constants = newConstants;
      thisExp.terms = newTerms;
      thisExp._sort();
    } else {
      throw new TypeError(
        'Invalid Argument (' +
          a.toString() +
          '): Multiplicand must be of type String, Expression, Term, Fraction or Integer.'
      );
    }

    return simplify || simplify === undefined ? thisExp.simplify() : thisExp;
  }

  divide(a, simplify) {
    if (a instanceof Fraction || isInt(a)) {
      if (a.valueOf() === 0) {
        throw new EvalError('Divide By Zero');
      }

      let copy = this.copy();

      for (let i = 0; i < copy.terms.length; i++) {
        let thisTerm = copy.terms[i];

        for (let j = 0; j < thisTerm.coefficients.length; j++) {
          thisTerm.coefficients[j] = thisTerm.coefficients[j].divide(
            a,
            simplify
          );
        }
      }

      //divide every constant by a
      copy.constants = copy.constants.map(function (c) {
        return c.divide(a, simplify);
      });

      return copy;
    } else if (a instanceof Expression) {
      //Simplify both expressions
      let num = this.copy().simplify();
      let denom = a.copy().simplify();

      //Total amount of terms and constants
      let numTotal = num.terms.length + num.constants.length;
      let denomTotal = denom.terms.length + denom.constants.length;

      //Check if both terms are monomial
      if (numTotal === 1 && denomTotal === 1) {
        //Devide coefficients
        let numCoef = num.terms[0].coefficients[0];
        let denomCoef = denom.terms[0].coefficients[0];

        //The expressions have just been simplified - only one coefficient per term
        num.terms[0].coefficients[0] = numCoef.divide(denomCoef, simplify);
        denom.terms[0].coefficients[0] = new Fraction(1, 1);

        //Cancel variables
        for (let i = 0; i < num.terms[0].variables.length; i++) {
          let numlet = num.terms[0].variables[i];
          for (let j = 0; j < denom.terms[0].variables.length; j++) {
            let denomlet = denom.terms[0].variables[j];
            //Check for equal variables
            if (numVar.variable === denomVar.variable) {
              //Use the rule for division of powers
              num.terms[0].variables[i].degree =
                numVar.degree - denomVar.degree;
              denom.terms[0].variables[j].degree = 0;
            }
          }
        }

        //Invers all degrees of remaining variables
        for (let i = 0; i < denom.terms[0].variables.length; i++) {
          denom.terms[0].variables[i].degree *= -1;
        }
        //Multiply the inversed variables to the numenator
        num = num.multiply(denom, simplify);

        return num;
      } else {
        throw new TypeError(
          'Invalid Argument ((' +
            num.toString() +
            ')/(' +
            denom.toString() +
            ')): Only monomial expressions can be divided.'
        );
      }
    } else {
      throw new TypeError(
        'Invalid Argument (' +
          a.toString() +
          '): Divisor must be of type Fraction or Integer.'
      );
    }
  }

  pow(a, simplify) {
    if (isInt(a)) {
      let copy = this.copy();

      if (a === 0) {
        return new Expression().add(1);
      } else {
        for (let i = 1; i < a; i++) {
          copy = copy.multiply(this, simplify);
        }

        copy._sort();
      }

      return simplify || simplify === undefined ? copy.simplify() : copy;
    } else {
      throw new TypeError(
        'Invalid Argument (' +
          a.toString() +
          '): Exponent must be of type Integer.'
      );
    }
  }

  eval(values, simplify) {
    let exp = new Expression();
    exp.constants = simplify ? [this.constant()] : this.constants.slice();

    //add all evaluated terms of this to exp
    exp = this.terms.reduce(function (p, c) {
      return p.add(c.eval(values, simplify), simplify);
    }, exp);

    return exp;
  }

  summation(variable, lower, upper, simplify) {
    let thisExpr = this.copy();
    let newExpr = new Expression();
    for (let i = lower; i < upper + 1; i++) {
      let sub = {};
      sub[variable] = i;
      newExpr = newExpr.add(thisExpr.eval(sub, simplify), simplify);
    }
    return newExpr;
  }

  toString(options) {
    let str = '';

    for (let i = 0; i < this.terms.length; i++) {
      let term = this.terms[i];

      str +=
        (term.coefficients[0].valueOf() < 0 ? ' - ' : ' + ') +
        term.toString(options);
    }

    for (let i = 0; i < this.constants.length; i++) {
      let constant = this.constants[i];

      str +=
        (constant.valueOf() < 0 ? ' - ' : ' + ') + constant.abs().toString();
    }

    if (str.substring(0, 3) === ' - ') {
      return '-' + str.substring(3, str.length);
    } else if (str.substring(0, 3) === ' + ') {
      return str.substring(3, str.length);
    } else {
      return '0';
    }
  }

  toTex(dict) {
    let str = '';

    for (let i = 0; i < this.terms.length; i++) {
      let term = this.terms[i];

      str +=
        (term.coefficients[0].valueOf() < 0 ? ' - ' : ' + ') + term.toTex(dict);
    }

    for (let i = 0; i < this.constants.length; i++) {
      let constant = this.constants[i];

      str += (constant.valueOf() < 0 ? ' - ' : ' + ') + constant.abs().toTex();
    }

    if (str.substring(0, 3) === ' - ') {
      return '-' + str.substring(3, str.length);
    } else if (str.substring(0, 3) === ' + ') {
      return str.substring(3, str.length);
    } else {
      return '0';
    }
  }

  _removeTermsWithCoefficientZero() {
    this.terms = this.terms.filter(function (t) {
      return t.coefficient().reduce().numer !== 0;
    });
    return this;
  }

  _combineLikeTerms() {
    function alreadyEncountered(term, encountered) {
      for (let i = 0; i < encountered.length; i++) {
        if (term.canBeCombinedWith(encountered[i])) {
          return true;
        }
      }

      return false;
    }

    let newTerms = [];
    let encountered = [];

    for (let i = 0; i < this.terms.length; i++) {
      let thisTerm = this.terms[i];

      if (alreadyEncountered(thisTerm, encountered)) {
        continue;
      } else {
        for (let j = i + 1; j < this.terms.length; j++) {
          let thatTerm = this.terms[j];

          if (thisTerm.canBeCombinedWith(thatTerm)) {
            thisTerm = thisTerm.add(thatTerm);
          }
        }

        newTerms.push(thisTerm);
        encountered.push(thisTerm);
      }
    }

    this.terms = newTerms;
    return this;
  }

  _moveTermsWithDegreeZeroToConstants() {
    let keepTerms = [];
    let constant = new Fraction(0, 1);

    for (let i = 0; i < this.terms.length; i++) {
      let thisTerm = this.terms[i];

      if (thisTerm.variables.length === 0) {
        constant = constant.add(thisTerm.coefficient());
      } else {
        keepTerms.push(thisTerm);
      }
    }

    this.constants.push(constant);
    this.terms = keepTerms;
    return this;
  }

  _sort() {
    function sortTerms(a, b) {
      let x = a.maxDegree();
      let y = b.maxDegree();

      if (x === y) {
        let m = a.variables.length;
        let n = b.variables.length;

        return n - m;
      } else {
        return y - x;
      }
    }

    this.terms = this.terms.sort(sortTerms);
    return this;
  }

  _hasVariable(variable) {
    for (let i = 0; i < this.terms.length; i++) {
      if (this.terms[i].hasVariable(variable)) {
        return true;
      }
    }

    return false;
  }

  _onlyHasVariable(variable) {
    for (let i = 0; i < this.terms.length; i++) {
      if (!this.terms[i].onlyHasVariable(variable)) {
        return false;
      }
    }

    return true;
  }

  _noCrossProductsWithVariable(variable) {
    for (let i = 0; i < this.terms.length; i++) {
      let term = this.terms[i];
      if (term.hasVariable(variable) && !term.onlyHasVariable(variable)) {
        return false;
      }
    }

    return true;
  }

  _noCrossProducts() {
    for (let i = 0; i < this.terms.length; i++) {
      let term = this.terms[i];
      if (term.variables.length > 1) {
        return false;
      }
    }

    return true;
  }

  _maxDegree() {
    return this.terms.reduce(function (p, c) {
      return Math.max(p, c.maxDegree());
    }, 1);
  }

  _maxDegreeOfVariable(variable) {
    return this.terms.reduce(function (p, c) {
      return Math.max(p, c.maxDegreeOfVariable(variable));
    }, 1);
  }

  _quadraticCoefficients() {
    // This function isn't used until everything has been moved to the LHS in Equation.solve.
    let a;
    let b = new Fraction(0, 1);
    for (let i = 0; i < this.terms.length; i++) {
      let thisTerm = this.terms[i];
      a = thisTerm.maxDegree() === 2 ? thisTerm.coefficient().copy() : a;
      b = thisTerm.maxDegree() === 1 ? thisTerm.coefficient().copy() : b;
    }
    let c = this.constant();

    return { a: a, b: b, c: c };
  }

  _cubicCoefficients() {
    // This function isn't used until everything has been moved to the LHS in Equation.solve.
    let a;
    let b = new Fraction(0, 1);
    let c = new Fraction(0, 1);

    for (let i = 0; i < this.terms.length; i++) {
      let thisTerm = this.terms[i];
      a = thisTerm.maxDegree() === 3 ? thisTerm.coefficient().copy() : a;
      b = thisTerm.maxDegree() === 2 ? thisTerm.coefficient().copy() : b;
      c = thisTerm.maxDegree() === 1 ? thisTerm.coefficient().copy() : c;
    }

    let d = this.constant();
    return { a: a, b: b, c: c, d: d };
  }
}

export class Term {
  constructor(variable) {
    if (variable instanceof Variable) {
      this.variables = [variable.copy()];
    } else if (typeof variable === 'undefined') {
      this.variables = [];
    } else {
      throw new TypeError(
        'Invalid Argument (' +
          variable.toString() +
          '): Term initializer must be of type Variable.'
      );
    }

    this.coefficients = [new Fraction(1, 1)];
  }

  coefficient() {
    //calculate the product of all coefficients
    return this.coefficients.reduce(function (p, c) {
      return p.multiply(c);
    }, new Fraction(1, 1));
  }

  simplify() {
    let copy = this.copy();
    copy.coefficients = [this.coefficient()];
    copy.combineVars();
    return copy.sort();
  }

  combineVars() {
    let uniqueVars = {};

    for (let i = 0; i < this.variables.length; i++) {
      let thisVar = this.variables[i];

      if (thisVar.variable in uniqueVars) {
        uniqueVars[thisVar.variable] += thisVar.degree;
      } else {
        uniqueVars[thisVar.variable] = thisVar.degree;
      }
    }

    let newVars = [];

    for (let v in uniqueVars) {
      let newVar = new Variable(v);
      newVar.degree = uniqueVars[v];
      newVars.push(newVar);
    }

    this.variables = newVars;
    return this;
  }

  copy() {
    let copy = new Term();
    copy.coefficients = this.coefficients.map(function (c) {
      return c.copy();
    });
    copy.variables = this.variables.map(function (v) {
      return v.copy();
    });
    return copy;
  }

  add(term) {
    if (term instanceof Term && this.canBeCombinedWith(term)) {
      let copy = this.copy();
      copy.coefficients = [copy.coefficient().add(term.coefficient())];
      return copy;
    } else {
      throw new TypeError(
        'Invalid Argument (' +
          term.toString() +
          '): Summand must be of type String, Expression, Term, Fraction or Integer.'
      );
    }
  }

  subtract(term) {
    if (term instanceof Term && this.canBeCombinedWith(term)) {
      let copy = this.copy();
      copy.coefficients = [copy.coefficient().subtract(term.coefficient())];
      return copy;
    } else {
      throw new TypeError(
        'Invalid Argument (' +
          term.toString() +
          '): Subtrahend must be of type String, Expression, Term, Fraction or Integer.'
      );
    }
  }

  multiply(a, simplify) {
    let thisTerm = this.copy();

    if (a instanceof Term) {
      thisTerm.variables = thisTerm.variables.concat(a.variables);
      thisTerm.coefficients = a.coefficients.concat(thisTerm.coefficients);
    } else if (isInt(a) || a instanceof Fraction) {
      let newCoef = isInt(a) ? new Fraction(a, 1) : a;

      if (thisTerm.variables.length === 0) {
        thisTerm.coefficients.push(newCoef);
      } else {
        thisTerm.coefficients.unshift(newCoef);
      }
    } else {
      throw new TypeError(
        'Invalid Argument (' +
          a.toString() +
          '): Multiplicand must be of type String, Expression, Term, Fraction or Integer.'
      );
    }

    return simplify || simplify === undefined ? thisTerm.simplify() : thisTerm;
  }

  divide(a, simplify) {
    if (isInt(a) || a instanceof Fraction) {
      let thisTerm = this.copy();
      thisTerm.coefficients = thisTerm.coefficients.map(function (c) {
        return c.divide(a, simplify);
      });
      return thisTerm;
    } else {
      throw new TypeError(
        'Invalid Argument (' +
          a.toString() +
          '): Argument must be of type Fraction or Integer.'
      );
    }
  }

  eval(values, simplify) {
    let copy = this.copy();
    let keys = Object.keys(values);
    let exp = copy.coefficients.reduce(function (p, c) {
      return p.multiply(c, simplify);
    }, new Expression(1));

    for (let i = 0; i < copy.variables.length; i++) {
      let thislet = copy.variables[i];

      let ev;

      if (thisVar.variable in values) {
        let sub = values[thisVar.variable];

        if (sub instanceof Fraction || sub instanceof Expression) {
          ev = sub.pow(thisVar.degree);
        } else if (isInt(sub)) {
          ev = Math.pow(sub, thisVar.degree);
        } else {
          throw new TypeError(
            'Invalid Argument (' +
              sub +
              '): Can only evaluate Expressions or Fractions.'
          );
        }
      } else {
        ev = new Expression(thisVar.variable).pow(thisVar.degree);
      }

      exp = exp.multiply(ev, simplify);
    }

    return exp;
  }

  hasVariable(variable) {
    for (let i = 0; i < this.variables.length; i++) {
      if (this.variables[i].variable === variable) {
        return true;
      }
    }

    return false;
  }

  maxDegree() {
    return this.variables.reduce(function (p, c) {
      return Math.max(p, c.degree);
    }, 1);
  }

  maxDegreeOfVariable(variable) {
    return this.variables.reduce(function (p, c) {
      return c.variable === variable ? Math.max(p, c.degree) : p;
    }, 1);
  }

  canBeCombinedWith(term) {
    let thisVars = this.variables;
    let thatVars = term.variables;

    if (thisVars.length != thatVars.length) {
      return false;
    }

    let matches = 0;

    for (let i = 0; i < thisVars.length; i++) {
      for (let j = 0; j < thatVars.length; j++) {
        if (
          thisVars[i].variable === thatVars[j].variable &&
          thisVars[i].degree === thatVars[j].degree
        ) {
          matches += 1;
        }
      }
    }

    return matches === thisVars.length;
  }

  onlyHasVariable(variable) {
    for (let i = 0; i < this.variables.length; i++) {
      if (this.variables[i].variable != variable) {
        return false;
      }
    }

    return true;
  }

  sort() {
    function sortVars(a, b) {
      return b.degree - a.degree;
    }

    this.variables = this.variables.sort(sortVars);
    return this;
  }

  toString(options) {
    let implicit = options && options.implicit;
    let str = '';

    for (let i = 0; i < this.coefficients.length; i++) {
      let coef = this.coefficients[i];

      if (coef.abs().numer !== 1 || coef.abs().denom !== 1) {
        str += ' * ' + coef.toString();
      }
    }
    str = this.variables.reduce(function (p, c) {
      if (implicit && !!p) {
        let vStr = c.toString();
        return !!vStr ? p + '*' + vStr : p;
      } else return p.concat(c.toString());
    }, str);
    str = str.substring(0, 3) === ' * ' ? str.substring(3, str.length) : str;
    str = str.substring(0, 1) === '-' ? str.substring(1, str.length) : str;

    return str;
  }

  toTex(dict = {}) {
    dict.multiplication = !('multiplication' in dict)
      ? 'cdot'
      : dict.multiplication;

    let op = ' \\' + dict.multiplication + ' ';

    let str = '';

    for (let i = 0; i < this.coefficients.length; i++) {
      let coef = this.coefficients[i];

      if (coef.abs().numer !== 1 || coef.abs().denom !== 1) {
        str += op + coef.toTex();
      }
    }
    str = this.variables.reduce(function (p, c) {
      return p.concat(c.toTex());
    }, str);
    str =
      str.substring(0, op.length) === op
        ? str.substring(op.length, str.length)
        : str;
    str = str.substring(0, 1) === '-' ? str.substring(1, str.length) : str;
    str =
      str.substring(0, 7) === '\\frac{-'
        ? '\\frac{' + str.substring(7, str.length)
        : str;

    return str;
  }
}

export class Variable {
  constructor(variable) {
    if (typeof variable === 'string') {
      this.variable = variable;
      this.degree = 1;
    } else {
      throw new TypeError(
        'Invalid Argument (' +
          variable.toString() +
          '): Variable initalizer must be of type String.'
      );
    }
  }

  copy() {
    let copy = new Variable(this.variable);
    copy.degree = this.degree;
    return copy;
  }

  toString() {
    let degree = this.degree;
    let variable = this.variable;

    if (degree === 0) {
      return '';
    } else if (degree === 1) {
      return variable;
    } else {
      return variable + '^' + degree;
    }
  }

  toTex() {
    let degree = this.degree;
    let variable = this.variable;

    if (GREEK_LETTERS.indexOf(variable) > -1) {
      variable = '\\' + variable;
    }

    if (degree === 0) {
      return '';
    } else if (degree === 1) {
      return variable;
    } else {
      return variable + '^{' + degree + '}';
    }
  }
}
