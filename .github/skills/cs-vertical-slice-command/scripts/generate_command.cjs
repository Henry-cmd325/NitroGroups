const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

async function generateCommand(moduleName, entityName, actionName, propertiesJson) {
    const projectRoot = process.cwd();
    const moduleBasePath = path.join(projectRoot, `Core/${moduleName}/NitroGroups.Core.${moduleName}.Application`);
    const infrastructureBasePath = path.join(projectRoot, `Core/${moduleName}/NitroGroups.Core.${moduleName}.Infrastructure`);
    const contractsBasePath = path.join(projectRoot, `Shared/NitroGroups.Shared.Contracts/${moduleName}`);
    const useCasePath = path.join(moduleBasePath, `UseCases/${actionName}`);

    // Ensure directories exist
    fs.mkdirSync(useCasePath, { recursive: true });
    fs.mkdirSync(contractsBasePath, { recursive: true });
    fs.mkdirSync(path.join(infrastructureBasePath, 'Endpoints'), { recursive: true });


    const properties = JSON.parse(propertiesJson);

    const templateData = {
        moduleName,
        entityName,
        actionName,
        properties,
        TResponse: `${actionName}Response`, // Assuming response is always named this way
        propertiesDefinition: properties.map(p => `${p.type} ${p.name}`).join(', ')
    };

    const templates = {
        command: fs.readFileSync(path.join(__dirname, '../assets/templates/command.hbs'), 'utf8'),
        commandHandler: fs.readFileSync(path.join(__dirname, '../assets/templates/command_handler.hbs'), 'utf8'),
        commandValidator: fs.readFileSync(path.join(__dirname, '../assets/templates/command_validator.hbs'), 'utf8'),
        request: fs.readFileSync(path.join(__dirname, '../assets/templates/request.hbs'), 'utf8'),
        response: fs.readFileSync(path.join(__dirname, '../assets/templates/response.hbs'), 'utf8'),
        endpoint: fs.readFileSync(path.join(__dirname, '../assets/templates/endpoint.hbs'), 'utf8')
    };

    const compiledTemplates = {};
    for (const key in templates) {
        compiledTemplates[key] = Handlebars.compile(templates[key]);
    }

    // Generate Command
    fs.writeFileSync(path.join(useCasePath, `${actionName}Command.cs`), compiledTemplates.command(templateData));
    console.log(`Generated ${actionName}Command.cs`);

    // Generate CommandHandler
    fs.writeFileSync(path.join(useCasePath, `${actionName}CommandHandler.cs`), compiledTemplates.commandHandler(templateData));
    console.log(`Generated ${actionName}CommandHandler.cs`);

    // Generate CommandValidator
    fs.writeFileSync(path.join(useCasePath, `${actionName}CommandValidator.cs`), compiledTemplates.commandValidator(templateData));
    console.log(`Generated ${actionName}CommandValidator.cs`);

    // Generate Request DTO
    fs.writeFileSync(path.join(contractsBasePath, `${actionName}Request.cs`), compiledTemplates.request(templateData));
    console.log(`Generated ${actionName}Request.cs`);

    // Generate Response DTO
    fs.writeFileSync(path.join(contractsBasePath, `${actionName}Response.cs`), compiledTemplates.response(templateData));
    console.log(`Generated ${actionName}Response.cs`);

    // Generate Endpoint
    fs.writeFileSync(path.join(infrastructureBasePath, `Endpoints/${actionName}Endpoint.cs`), compiledTemplates.endpoint(templateData));
    console.log(`Generated ${actionName}Endpoint.cs`);

    console.log(`Successfully generated files for ${actionName} in module ${moduleName}`);
}

// Command-line argument parsing
const args = process.argv.slice(2);
if (args.length < 4) {
    console.error('Usage: node generate_command.cjs <moduleName> <entityName> <actionName> <propertiesJson>');
    process.exit(1);
}

const [moduleName, entityName, actionName, propertiesJson] = args;

generateCommand(moduleName, entityName, actionName, propertiesJson).catch(error => {
    console.error('Error generating command:', error);
    process.exit(1);
});
