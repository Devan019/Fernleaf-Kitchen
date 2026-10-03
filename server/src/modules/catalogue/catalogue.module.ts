import { Module } from '@nestjs/common';
import { DishesController } from './dishes/dishes.controller.js';
import { DishesService } from './dishes/dishes.service.js';
import { OptionsController } from './options/options.controller.js';
import { OptionsService } from './options/options.service.js';
import { OptionGroupsController } from './option-groups/option-groups.controller.js';
import { OptionGroupsService } from './option-groups/option-groups.service.js';
import { ReferenceDataController } from './reference-data/reference-data.controller.js';
import { ReferenceDataService } from './reference-data/reference-data.service.js';

@Module({
  controllers: [
    DishesController,
    OptionsController,
    OptionGroupsController,
    ReferenceDataController,
  ],
  providers: [
    DishesService,
    OptionsService,
    OptionGroupsService,
    ReferenceDataService,
  ],
  exports: [
    DishesService,
    OptionsService,
    OptionGroupsService,
    ReferenceDataService,
  ],
})
export class CatalogueModule {}
