import request from 'supertest';
import { viteNodeApp } from './app';

describe('GET /', () => {
  it('should return 200 OK', async () => {
    const res = await request(viteNodeApp).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toEqual('Bootstrapper Service is running');
  });
});
