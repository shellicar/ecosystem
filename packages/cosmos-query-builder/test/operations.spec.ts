import { describe, expect, it } from 'vitest';
import { createCosmosQueryBuilder, SortDirection } from '../src';

type MyEntity = {
  givenName: string;
  familyName: string;
};

describe('operations', () => {
  describe('eq', () => {
    it('builds a basic query', () => {
      const builder = createCosmosQueryBuilder<MyEntity>();
      builder.where('givenName', 'eq', 'Joe');
      const query = builder.query();

      expect(query.query).toBe(`SELECT
  *
FROM
  c
WHERE
  c.givenName = @p0`);
    });

    it('puts each where on a new line', () => {
      const builder = createCosmosQueryBuilder<MyEntity>();
      builder.where('givenName', 'eq', 'Joe');
      builder.where('familyName', 'eq', 'Bloggs');
      const query = builder.query();

      expect(query.query).toBe(`SELECT
  *
FROM
  c
WHERE
  c.givenName = @p0 AND
  c.familyName = @p1`);
    });
  });

  describe('ieq', () => {
    it('passes parameter name', () => {
      const builder = createCosmosQueryBuilder<MyEntity>();
      builder.where('givenName', 'ieq', 'joe');
      const query = builder.query();

      expect(query.parameters?.[0].name).toBe('@p0');
    });

    it('passes parameter value', () => {
      const builder = createCosmosQueryBuilder<MyEntity>();
      builder.where('givenName', 'ieq', 'joe');
      const query = builder.query();

      expect(query.parameters?.[0].value).toBe('joe');
    });

    it('builds a basic query', () => {
      const builder = createCosmosQueryBuilder<MyEntity>();
      builder.where('givenName', 'ieq', 'joe');
      const query = builder.query();

      expect(query.query).toBe(`SELECT
  *
FROM
  c
WHERE
  StringEquals(c.givenName, @p0, true)`);
    });
  });

  describe('ine', () => {
    it('builds a basic query', () => {
      const builder = createCosmosQueryBuilder<MyEntity>();
      builder.where('givenName', 'ine', 'joe');
      const query = builder.query();

      expect(query.query).toBe(`SELECT
  *
FROM
  c
WHERE
  Not(StringEquals(c.givenName, @p0, true))`);
    });
  });

  describe('where and order', () => {
    it('two where and order', () => {
      const builder = createCosmosQueryBuilder<MyEntity>();
      builder.select('c.sex');
      builder.where('givenName', 'eq', 'Joe');
      builder.where('familyName', 'eq', 'Bloggs');
      builder.orderBy('givenName', SortDirection.Desc);
      builder.limit(10);
      builder.groupBy('UPPER(c.sex) as sex');
      const query = builder.query();

      expect(query.query).toBe(`SELECT
  c.sex
FROM
  c
WHERE
  c.givenName = @p0 AND
  c.familyName = @p1
ORDER BY
  c.givenName DESC
GROUP BY
  UPPER(c.sex) as sex
OFFSET 0
LIMIT 10`);
    });

    it('one where and order', () => {
      const builder = createCosmosQueryBuilder<MyEntity>();
      builder.where('givenName', 'eq', 'Joe');
      builder.orderBy('givenName', SortDirection.Desc);
      const query = builder.query();
      expect(query.query).toBe(`SELECT
  *
FROM
  c
WHERE
  c.givenName = @p0
ORDER BY
  c.givenName DESC`);
    });
  });

  describe('builder pattern', () => {
    it('allow chaining operations', () => {
      const query = createCosmosQueryBuilder<MyEntity>().where('givenName', 'eq', 'Joe').orderBy('givenName', SortDirection.Desc).query();

      expect(query.query).toBe(`SELECT
  *
FROM
  c
WHERE
  c.givenName = @p0
ORDER BY
  c.givenName DESC`);
    });
  });

  describe('whereOr', () => {
    describe('in', () => {
      it('emits ARRAY_CONTAINS wrapped in the OR group', () => {
        const expected = `SELECT
  *
FROM
  c
WHERE
  (ARRAY_CONTAINS(@p0, c.givenName))`;

        const builder = createCosmosQueryBuilder<MyEntity>();
        builder.whereOr([{ field: 'givenName', operator: 'in', value: ['joe', 'bob'] }]);
        const actual = builder.query().query;

        expect(actual).toBe(expected);
      });

      it('binds parameters[0] to the array value with name @p0', () => {
        const expected = { name: '@p0', value: ['joe', 'bob'] };

        const builder = createCosmosQueryBuilder<MyEntity>();
        builder.whereOr([{ field: 'givenName', operator: 'in', value: ['joe', 'bob'] }]);
        const actual = builder.query().parameters?.[0];

        expect(actual).toEqual(expected);
      });
    });

    describe('contains', () => {
      it('emits ARRAY_CONTAINS wrapped in the OR group', () => {
        const expected = `SELECT
  *
FROM
  c
WHERE
  (ARRAY_CONTAINS(c.givenName, @p0))`;

        const builder = createCosmosQueryBuilder<MyEntity>();
        builder.whereOr([{ field: 'givenName', operator: 'contains', value: 'joe' }]);
        const actual = builder.query().query;

        expect(actual).toBe(expected);
      });

      it('binds parameters[0] to the value with name @p0', () => {
        const expected = { name: '@p0', value: 'joe' };

        const builder = createCosmosQueryBuilder<MyEntity>();
        builder.whereOr([{ field: 'givenName', operator: 'contains', value: 'joe' }]);
        const actual = builder.query().parameters?.[0];

        expect(actual).toEqual(expected);
      });
    });

    describe('ieq', () => {
      it('emits StringEquals wrapped in the OR group', () => {
        const expected = `SELECT
  *
FROM
  c
WHERE
  (StringEquals(c.givenName, @p0, true))`;

        const builder = createCosmosQueryBuilder<MyEntity>();
        builder.whereOr([{ field: 'givenName', operator: 'ieq', value: 'joe' }]);
        const actual = builder.query().query;

        expect(actual).toBe(expected);
      });

      it('binds parameters[0] to the value with name @p0', () => {
        const expected = { name: '@p0', value: 'joe' };

        const builder = createCosmosQueryBuilder<MyEntity>();
        builder.whereOr([{ field: 'givenName', operator: 'ieq', value: 'joe' }]);
        const actual = builder.query().parameters?.[0];

        expect(actual).toEqual(expected);
      });
    });

    describe('ine', () => {
      it('emits Not(StringEquals) wrapped in the OR group', () => {
        const expected = `SELECT
  *
FROM
  c
WHERE
  (Not(StringEquals(c.givenName, @p0, true)))`;

        const builder = createCosmosQueryBuilder<MyEntity>();
        builder.whereOr([{ field: 'givenName', operator: 'ine', value: 'joe' }]);
        const actual = builder.query().query;

        expect(actual).toBe(expected);
      });

      it('binds parameters[0] to the value with name @p0', () => {
        const expected = { name: '@p0', value: 'joe' };

        const builder = createCosmosQueryBuilder<MyEntity>();
        builder.whereOr([{ field: 'givenName', operator: 'ine', value: 'joe' }]);
        const actual = builder.query().parameters?.[0];

        expect(actual).toEqual(expected);
      });
    });

    describe('counter advancement', () => {
      it('assigns distinct parameter names to two in conditions', () => {
        const expected = `SELECT
  *
FROM
  c
WHERE
  (ARRAY_CONTAINS(@p0, c.givenName) OR ARRAY_CONTAINS(@p1, c.familyName))`;

        const builder = createCosmosQueryBuilder<MyEntity>();
        builder.whereOr([
          { field: 'givenName', operator: 'in', value: ['joe'] },
          { field: 'familyName', operator: 'in', value: ['smith'] },
        ]);
        const actual = builder.query().query;

        expect(actual).toBe(expected);
      });

      it('assigns distinct parameter names to two contains conditions', () => {
        const expected = `SELECT
  *
FROM
  c
WHERE
  (ARRAY_CONTAINS(c.givenName, @p0) OR ARRAY_CONTAINS(c.familyName, @p1))`;

        const builder = createCosmosQueryBuilder<MyEntity>();
        builder.whereOr([
          { field: 'givenName', operator: 'contains', value: 'joe' },
          { field: 'familyName', operator: 'contains', value: 'smith' },
        ]);
        const actual = builder.query().query;

        expect(actual).toBe(expected);
      });

      it('assigns distinct parameter indices across mixed operators', () => {
        const expected = `SELECT
  *
FROM
  c
WHERE
  (ARRAY_CONTAINS(@p0, c.givenName) OR c.familyName = @p1 OR ARRAY_CONTAINS(c.givenName, @p2) OR StringEquals(c.familyName, @p3, true))`;

        const builder = createCosmosQueryBuilder<MyEntity>();
        builder.whereOr([
          { field: 'givenName', operator: 'in', value: ['joe'] },
          { field: 'familyName', operator: 'eq', value: 'smith' },
          { field: 'givenName', operator: 'contains', value: 'bob' },
          { field: 'familyName', operator: 'ieq', value: 'JONES' },
        ]);
        const actual = builder.query().query;

        expect(actual).toBe(expected);
      });
    });
  });

});
