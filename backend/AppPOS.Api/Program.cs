using AppPOS.Api.Models;
using Microsoft.EntityFrameworkCore;
using Swashbuckle.AspNetCore;
using System;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppPosDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.UseRouting();


app.Run();
