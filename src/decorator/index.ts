import { SetMetadata } from "@nestjs/common";
import { RoleDecoratorParams } from "src/core/types/roles";

export const Permission = (params: RoleDecoratorParams) =>
  SetMetadata('permission', params);
export const Authorization = (strict: 'strict' | 'loose') => SetMetadata('authorization', strict);
export const ByPass = (pass: 'pass') => SetMetadata('by-pass', pass);
export const FeatureManagement = (params: string) => SetMetadata('feature', params);
export const IsLevelTwo = (level: 'two') => SetMetadata('level-two', level)
export const IsLevelThree = (level: 'three') => SetMetadata('level-three', level)
