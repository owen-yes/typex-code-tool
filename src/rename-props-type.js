/**
 * ai 生成，将项目中的 type IProps {...}、interface IProps {...} 修改为 组件名+Props 的形式
 * 包括引用了 IProps 的地方
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Step 1: Find all possible props type declarations (both type and interface)
  const propsTypeDeclarations = root.find(j.TSTypeAliasDeclaration, {
    id: { name: (name) => name === "IProps" || name.endsWith("Props") },
  });

  const propsInterfaceDeclarations = root.find(j.TSInterfaceDeclaration, {
    id: { name: (name) => name === "IProps" || name.endsWith("Props") },
  });

  if (propsTypeDeclarations.size() === 0 && propsInterfaceDeclarations.size() === 0) return null;

  // Step 2: Find component declarations
  const componentDeclarations = root
    .find(j.VariableDeclaration)
    .filter((path) => {
      const declarator = path.value.declarations[0];
      if (!j.VariableDeclarator.check(declarator)) return false;
      if (!declarator.id.typeAnnotation) return false;

      const typeAnnotation = declarator.id.typeAnnotation.typeAnnotation;
      
      // Handle React.FC<IProps>
      if (j.TSTypeReference.check(typeAnnotation)) {
        const typeName = typeAnnotation.typeName;
        if (j.TSQualifiedName.check(typeName)) {
          return typeName.left.name === "React";
        }
      }

      // Handle function component with explicit props type
      if (j.TSFunctionType.check(typeAnnotation)) {
        const params = typeAnnotation.parameters;
        return (
          params.length === 1 &&
          j.TSParameterProperty.check(params[0]) &&
          params[0].parameter.typeAnnotation?.typeAnnotation?.typeName?.name ===
            "IProps"
        );
      }

      return false;
    });

  if (componentDeclarations.size() === 0) return null;

  // Step 3: Get component name and create new type name
  const componentName =
    componentDeclarations.__paths[0].value.declarations[0].id.name;
  const newTypeName = `${componentName}Props`;

  // Step 4: Rename props type declarations
  propsTypeDeclarations.forEach((path) => {
    if (path.value.id.name === "IProps") {
      path.value.id.name = newTypeName;
    }
  });

  // Step 4.1: Rename props interface declarations
  propsInterfaceDeclarations.forEach((path) => {
    if (path.value.id.name === "IProps") {
      path.value.id.name = newTypeName;
    }
  });

  // Step 5: Replace all references to IProps
  root
    .find(j.TSTypeReference, {
      typeName: { type: "Identifier", name: "IProps" },
    })
    .forEach((path) => {
      path.node.typeName.name = newTypeName;
    });

  // Step 6: Replace indexed access types
  root
    .find(j.TSIndexedAccessType, {
      objectType: { type: "TSTypeReference", typeName: { name: "IProps" } },
    })
    .forEach((path) => {
      path.node.objectType.typeName.name = newTypeName;
    });

  // Step 7: Replace in type parameters
  root.find(j.TSTypeParameterInstantiation).forEach((path) => {
    path.value.params.forEach((param) => {
      if (j.TSTypeReference.check(param) && param.typeName.name === "IProps") {
        param.typeName.name = newTypeName;
      }
    });
  });

  // Step 8: Replace in type literals and interfaces
  root.find(j.TSTypeLiteral).forEach((path) => {
    path.value.members.forEach((member) => {
      if (j.TSPropertySignature.check(member)) {
        if (j.TSTypeReference.check(member.typeAnnotation?.typeAnnotation)) {
          const typeRef = member.typeAnnotation.typeAnnotation;
          if (typeRef.typeName.name === "IProps") {
            typeRef.typeName.name = newTypeName;
          }
        }
      }
    });
  });

  // Step 9: Replace in generic type parameters
  root.find(j.TSTypeParameter).forEach((path) => {
    if (j.TSTypeReference.check(path.value.constraint)) {
      const constraint = path.value.constraint;
      if (constraint.typeName.name === "IProps") {
        constraint.typeName.name = newTypeName;
      }
    }
  });

  // Step 10: Replace in type assertions
  root.find(j.TSTypeAssertion).forEach((path) => {
    if (j.TSTypeReference.check(path.value.typeAnnotation)) {
      const typeRef = path.value.typeAnnotation;
      if (typeRef.typeName.name === "IProps") {
        typeRef.typeName.name = newTypeName;
      }
    }
  });

  // Step 11: Replace in interface extends
  root.find(j.TSInterfaceDeclaration).forEach((path) => {
    if (path.value.extends) {
      path.value.extends.forEach((extend) => {
        if (j.TSTypeReference.check(extend.expression) && extend.expression.typeName.name === "IProps") {
          extend.expression.typeName.name = newTypeName;
        }
      });
    }
  });

  return root.toSource({ quote: "single", trailingComma: true });
};
