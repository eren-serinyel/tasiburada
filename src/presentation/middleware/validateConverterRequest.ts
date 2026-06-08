import { NextFunction, Request, Response } from 'express';

const FLOW_TYPES = new Set(['household']);
const MOVE_TYPES = new Set(['household', 'partial_load']);
const PROPERTY_TYPES = new Set(['studio', '1+1', '2+1', '3+1', '4+1_plus', 'unknown']);
const LOAD_TYPES = new Set(['HOME', 'OFFICE', 'PARTIAL', 'STORAGE']);
const CUSTOM_ITEM_SIZE_CLASSES = new Set(['small', 'medium', 'large', 'very_large']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateCreateConverterSession = (req: Request, res: Response, next: NextFunction): void => {
  const { flowType } = req.body ?? {};
  if (!flowType || !FLOW_TYPES.has(flowType)) {
    res.status(400).json({
      success: false,
      message: 'flowType zorunludur ve household olmalıdır.',
    });
    return;
  }
  next();
};

export const validateEstimateConverterRequest = (req: Request, res: Response, next: NextFunction): void => {
  const {
    moveType,
    propertyType,
    loadType,
    items,
    originFloor,
    destinationFloor,
    buildingElevator,
    externalLift,
    specialItems,
    customItems,
  } = req.body ?? {};

  if (!MOVE_TYPES.has(moveType)) {
    res.status(400).json({ success: false, message: 'moveType geçersiz.' });
    return;
  }
  if (!PROPERTY_TYPES.has(propertyType)) {
    res.status(400).json({ success: false, message: 'propertyType geçersiz.' });
    return;
  }
  if (loadType !== undefined && !LOAD_TYPES.has(loadType)) {
    res.status(400).json({ success: false, message: 'loadType gecersiz.' });
    return;
  }
  if (!Array.isArray(items) || items.length > 200) {
    res.status(400).json({ success: false, message: 'items dizisi zorunludur ve 200 kaydı aşamaz.' });
    return;
  }

  for (const [index, item] of items.entries()) {
    if (!item || typeof item.itemCode !== 'string' || item.itemCode.trim() === '') {
      res.status(400).json({ success: false, message: `items[${index}].itemCode zorunludur.` });
      return;
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 0 || item.quantity > 999) {
      res.status(400).json({ success: false, message: `items[${index}].quantity 0 ile 999 arasında tam sayı olmalıdır.` });
      return;
    }
  }

  if (!Number.isInteger(originFloor) || originFloor < -5 || originFloor > 100) {
    res.status(400).json({ success: false, message: 'originFloor -5 ile 100 arasında tam sayı olmalıdır.' });
    return;
  }
  if (!Number.isInteger(destinationFloor) || destinationFloor < -5 || destinationFloor > 100) {
    res.status(400).json({ success: false, message: 'destinationFloor -5 ile 100 arasında tam sayı olmalıdır.' });
    return;
  }
  if (typeof buildingElevator !== 'boolean') {
    res.status(400).json({ success: false, message: 'buildingElevator boolean olmalıdır.' });
    return;
  }
  if (typeof externalLift !== 'boolean') {
    res.status(400).json({ success: false, message: 'externalLift boolean olmalıdır.' });
    return;
  }
  if (specialItems !== undefined && !Array.isArray(specialItems)) {
    res.status(400).json({ success: false, message: 'specialItems varsa dizi olmalıdır.' });
    return;
  }
  if (customItems !== undefined) {
    if (!Array.isArray(customItems) || customItems.length > 5) {
      res.status(400).json({ success: false, message: 'customItems varsa dizi olmalıdır ve 5 kaydı aşamaz.' });
      return;
    }

    for (const [index, item] of customItems.entries()) {
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      if (name.length < 2 || name.length > 50) {
        res.status(400).json({ success: false, message: `customItems[${index}].name 2 ile 50 karakter arasında olmalıdır.` });
        return;
      }
      if (!CUSTOM_ITEM_SIZE_CLASSES.has(item?.sizeClass)) {
        res.status(400).json({ success: false, message: `customItems[${index}].sizeClass geçersiz.` });
        return;
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
        res.status(400).json({ success: false, message: `customItems[${index}].quantity 1 ile 50 arasında tam sayı olmalıdır.` });
        return;
      }
      item.name = name;
    }
  }

  next();
};

export const validateApplyConverterRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { shipmentId } = req.body ?? {};
  if (typeof shipmentId !== 'string' || !UUID_RE.test(shipmentId)) {
    res.status(400).json({ success: false, message: 'shipmentId geçerli bir uuid olmalıdır.' });
    return;
  }
  next();
};

