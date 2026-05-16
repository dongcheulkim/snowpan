import { Request, Response, NextFunction } from 'express';

// UUID v4 형식 검증 — Prisma findUnique 가 비-UUID 문자열 받으면 prisma client 단계에서
// 에러 나거나 일부 DB 어댑터에서 느린 type cast 발생. 라우트 단에서 미리 차단.
//
// 사용: router.get('/:id', validateUUIDParam('id'), handler)
//      또는 router.use('/:userId', validateUUIDParam('userId'))
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUUIDParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    if (!value) { next(); return; }
    if (!UUID_V4.test(value)) {
      res.status(400).json({ error: '잘못된 식별자 형식입니다.' });
      return;
    }
    next();
  };
}

// 다중 파라미터 검증
export function validateUUIDParams(...names: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const name of names) {
      const value = req.params[name];
      if (value && !UUID_V4.test(value)) {
        res.status(400).json({ error: `잘못된 ${name} 형식입니다.` });
        return;
      }
    }
    next();
  };
}
