'use strict';
const {runProject}=require('./project-service');
exports.compilePbl=(pblPath,pbVersion,options={})=>runProject(pblPath,pbVersion,options,'compile');

